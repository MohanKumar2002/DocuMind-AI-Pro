"""
Database layer — Local PostgreSQL Client Emulator + ChromaDB vector store
"""
import os
import json
import uuid
import logging
from datetime import datetime
import bcrypt
from sqlalchemy import create_engine, text
from chromadb import PersistentClient
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
import chromadb
from config import settings

logger = logging.getLogger(__name__)

# ── PostgreSQL Engine & Initializer ──
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

def init_db():
    logger.info("🚀 Initializing local PostgreSQL database & tables...")
    try:
        with engine.begin() as conn:
            # Enable pgcrypto for gen_random_uuid() if available
            try:
                conn.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto";'))
            except Exception as ext_err:
                logger.warning(f"Could not install pgcrypto extension (usually fine on PostgreSQL 13+): {ext_err}")

            # Profiles Table
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.profiles (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT,
                full_name TEXT,
                plan TEXT DEFAULT 'free' CHECK (plan IN ('free','student','pro','business')),
                docs_used INTEGER DEFAULT 0,
                questions_used INTEGER DEFAULT 0,
                razorpay_customer_id TEXT,
                subscription_id TEXT,
                subscription_status TEXT DEFAULT 'inactive',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            """))

            # Documents Table
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.documents (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER,
                pages INTEGER DEFAULT 0,
                chunk_count INTEGER DEFAULT 0,
                collection_id TEXT NOT NULL,
                status TEXT DEFAULT 'processing' CHECK (status IN ('processing','ready','error')),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            """))

            # Chat Messages Table
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.chat_messages (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
                document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
                role TEXT CHECK (role IN ('user','assistant')),
                content TEXT NOT NULL,
                sources JSONB DEFAULT '[]',
                language TEXT DEFAULT 'en',
                tokens_used INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            """))

            # Payments Table
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.payments (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
                razorpay_order_id TEXT,
                razorpay_payment_id TEXT,
                amount INTEGER NOT NULL,
                currency TEXT DEFAULT 'INR',
                plan TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            """))

            # Quizzes Table
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.quizzes (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
                document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
                questions JSONB NOT NULL,
                score INTEGER,
                completed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            """))
        logger.info("Local PostgreSQL database initialized ✓")
    except Exception as e:
        logger.error(f"❌ Failed to initialize local PostgreSQL database: {e}")

# Run database setup on startup
init_db()


# ── Supabase Query Emulator ──

class EmulatorResponse:
    def __init__(self, data):
        self.data = data

class SupabaseQueryEmulator:
    def __init__(self, table_name):
        self.table_name = table_name
        self.op = None
        self.columns = "*"
        self.data_payload = None
        self.filters = []
        self.order_by_col = None
        self.order_desc_val = False
        self.limit_val = None
        self.single_val = False

    def select(self, columns="*"):
        self.op = "select"
        self.columns = columns
        return self

    def insert(self, data):
        self.op = "insert"
        self.data_payload = data
        return self

    def update(self, data):
        self.op = "update"
        self.data_payload = data
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, column, value):
        self.filters.append((column, "=", value))
        return self

    def order(self, column, desc=False):
        self.order_by_col = column
        self.order_desc_val = desc
        return self

    def limit(self, num):
        self.limit_val = num
        return self

    def single(self):
        self.single_val = True
        return self

    def execute(self):
        params = {}

        # Build WHERE clause
        where_clause = ""
        if self.filters:
            where_clauses = []
            for i, (col, op, val) in enumerate(self.filters):
                param_key = f"filter_{i}"
                where_clauses.append(f"{col} {op} :{param_key}")
                if isinstance(val, uuid.UUID):
                    params[param_key] = str(val)
                elif isinstance(val, (dict, list)):
                    params[param_key] = json.dumps(val)
                else:
                    params[param_key] = val
            where_clause = " WHERE " + " AND ".join(where_clauses)

        # Build ORDER BY clause
        order_clause = ""
        if self.order_by_col:
            direction = "DESC" if self.order_desc_val else "ASC"
            order_clause = f" ORDER BY {self.order_by_col} {direction}"

        # Build LIMIT clause
        limit_clause = ""
        if self.limit_val is not None:
            limit_clause = f" LIMIT {self.limit_val}"

        # ── SELECT Operation ──
        if self.op == "select":
            sql = f"SELECT {self.columns} FROM public.{self.table_name}{where_clause}{order_clause}{limit_clause}"
            with engine.connect() as conn:
                res = conn.execute(text(sql), params)
                fetched_rows = [dict(row) for row in res.mappings()]
            
            result_data = fetched_rows[0] if self.single_val and fetched_rows else (None if self.single_val else fetched_rows)
            return EmulatorResponse(result_data)

        # ── INSERT Operation (with Upsert logic for profiles table) ──
        elif self.op == "insert":
            rows = self.data_payload if isinstance(self.data_payload, list) else [self.data_payload]
            if not rows:
                return EmulatorResponse([])

            keys = list(rows[0].keys())
            cols_str = ", ".join(keys)

            # Check if this is profiles to enable upsert on ON CONFLICT
            conflict_clause = ""
            if self.table_name == "profiles":
                update_cols = [f"{k} = EXCLUDED.{k}" for k in keys if k not in ("id", "password_hash")]
                if update_cols:
                    conflict_clause = f" ON CONFLICT (id) DO UPDATE SET {', '.join(update_cols)}"
                elif "email" in keys:
                    conflict_clause = f" ON CONFLICT (email) DO NOTHING"

            inserted_rows = []
            with engine.connect() as conn:
                for idx, row in enumerate(rows):
                    row_params = {}
                    placeholders = []
                    for k, v in row.items():
                        param_key = f"val_{k}_{idx}"
                        placeholders.append(f":{param_key}")
                        if isinstance(v, (dict, list)):
                            row_params[param_key] = json.dumps(v)
                        elif isinstance(v, uuid.UUID):
                            row_params[param_key] = str(v)
                        else:
                            row_params[param_key] = v
                    val_str = ", ".join(placeholders)
                    insert_sql = f"INSERT INTO public.{self.table_name} ({cols_str}) VALUES ({val_str}){conflict_clause} RETURNING *"
                    res = conn.execute(text(insert_sql), row_params)
                    first_row = res.mappings().first()
                    inserted_rows.append(dict(first_row) if first_row else row)
                conn.commit()

            result_data = inserted_rows[0] if self.single_val and inserted_rows else (inserted_rows if isinstance(self.data_payload, list) else inserted_rows)
            return EmulatorResponse(result_data)

        # ── UPDATE Operation ──
        elif self.op == "update":
            set_clauses = []
            for k, v in self.data_payload.items():
                param_key = f"update_{k}"
                set_clauses.append(f"{k} = :{param_key}")
                if isinstance(v, (dict, list)):
                    params[param_key] = json.dumps(v)
                elif isinstance(v, uuid.UUID):
                    params[param_key] = str(v)
                else:
                    params[param_key] = v
            set_str = ", ".join(set_clauses)
            sql = f"UPDATE public.{self.table_name} SET {set_str}{where_clause} RETURNING *"
            with engine.connect() as conn:
                res = conn.execute(text(sql), params)
                fetched_rows = [dict(row) for row in res.mappings()]
                conn.commit()

            result_data = fetched_rows[0] if self.single_val and fetched_rows else (None if self.single_val else fetched_rows)
            return EmulatorResponse(result_data)

        # ── DELETE Operation ──
        elif self.op == "delete":
            sql = f"DELETE FROM public.{self.table_name}{where_clause} RETURNING *"
            with engine.connect() as conn:
                res = conn.execute(text(sql), params)
                fetched_rows = [dict(row) for row in res.mappings()]
                conn.commit()

            result_data = fetched_rows[0] if self.single_val and fetched_rows else (None if self.single_val else fetched_rows)
            return EmulatorResponse(result_data)


# ── Local Auth Helper Wrapper ──

class AuthUser:
    def __init__(self, user_id):
        self.id = user_id

class AuthResult:
    def __init__(self, user_id):
        self.user = AuthUser(user_id)

class AdminAuth:
    def create_user(self, details):
        email = details.get("email")
        password = details.get("password")
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user_id = str(uuid.uuid4())
        
        with engine.connect() as conn:
            # Check if email is already taken
            dup = conn.execute(text("SELECT id FROM public.profiles WHERE email = :email"), {"email": email}).first()
            if dup:
                raise Exception("A user with this email address has already been registered")
            
            # Insert auth credentials
            conn.execute(text("""
                INSERT INTO public.profiles (id, email, password_hash)
                VALUES (:id, :email, :password_hash)
            """), {"id": user_id, "email": email, "password_hash": password_hash})
            conn.commit()
            
        return AuthResult(user_id)

class AuthAdminWrapper:
    def __init__(self):
        self.admin = AdminAuth()

class ClientAuth:
    def sign_in_with_password(self, details):
        email = details.get("email")
        password = details.get("password")
        
        with engine.connect() as conn:
            user = conn.execute(text("SELECT id, password_hash FROM public.profiles WHERE email = :email"), {"email": email}).first()
            if not user or not user.password_hash:
                raise Exception("Invalid email or password")
            
            # Verify hashed password
            if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
                raise Exception("Invalid email or password")
                
            return AuthResult(str(user.id))

class SupabaseAdminWrapper:
    def __init__(self):
        self.auth = AuthAdminWrapper()

    def table(self, name):
        return SupabaseQueryEmulator(name)

class SupabaseClientEmulator:
    def __init__(self):
        self.auth = ClientAuth()

    def table(self, name):
        return SupabaseQueryEmulator(name)


# ── Exposed Mock Clients ──
supabase = SupabaseClientEmulator()
supabase_admin = SupabaseAdminWrapper()

def get_supabase():
    return supabase

def get_supabase_admin():
    return supabase_admin


# ── ChromaDB + HuggingFace Embeddings (Retained) ──
_chroma_client = None
_embedding_fn = None

def get_embedding_fn():
    global _embedding_fn
    if _embedding_fn is None:
        logger.info(f"Loading HuggingFace embedding model: {settings.HF_EMBEDDING_MODEL}")
        _embedding_fn = SentenceTransformerEmbeddingFunction(
            model_name=settings.HF_EMBEDDING_MODEL
        )
        logger.info("Embedding model loaded ✓")
    return _embedding_fn

def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = PersistentClient(path=settings.CHROMA_DIR)
        logger.info(f"ChromaDB initialized at {settings.CHROMA_DIR} ✓")
    return _chroma_client

def get_collection(collection_name: str = "documind_vectors"):
    client = get_chroma_client()
    emb_fn = get_embedding_fn()
    return client.get_or_create_collection(
        name=collection_name,
        embedding_function=emb_fn,
        metadata={"hnsw:space": "cosine"}
    )

SUPABASE_SCHEMA = "" # schema is now automatically created by init_db()
