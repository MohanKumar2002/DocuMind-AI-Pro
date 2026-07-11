<div align="center">
  <h1 align="center">DocuMind AI Pro</h1>
  <h3 align="center">Enterprise Document Intelligence by Mohan Kumar S</h3>
  
  <p align="center">
    <a href="https://mohankumar-ai.vercel.app/" target="_blank">Portfolio</a> •
    <a href="https://www.linkedin.com/in/mohan-kumar-subramanian-a46a77226" target="_blank">LinkedIn</a> •
    <a href="mailto:mohanmohanmk684@gmail.com">Contact</a>
  </p>

  <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=500&size=20&duration=4000&pause=1000&color=0066FF&center=true&vCenter=true&width=800&lines=Chat+with+any+PDF+instantly;Automated+Invoice+Data+Extraction;Intelligent+Document+Summarization;Built+with+FastAPI,+React,+and+Groq" alt="Typing Header" />
</div>

<br/>

> **Project Mission:** Architecting the next generation of intelligent document systems. DocuMind AI Pro is a full-stack platform that leverages Retrieval-Augmented Generation (RAG) and ultra-fast LLMs to extract insights, chat with enterprise data, and automate data-entry workflows securely.

<br/>

### 🔬 Core Technology Stack

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=python,js,react,fastapi,tailwind,postgres,git,docker,linux&theme=dark&perline=12" alt="Skill Icons" />
  </a>
</p>

---

<table width="100%" style="border: none;">
<tr>
<td width="50%" valign="top">

### 💼 Core Capabilities

**Intelligent Data Extraction**  
- Automatically extract structured data (JSON, CSV) from unstructured documents like invoices, receipts, and forms.
- Replaces hours of manual data entry with instant, AI-driven precision.

<br/>

**RAG-Powered Document Chat**  
- Seamlessly query 1000+ page PDFs in seconds. 
- The system embeds text via HuggingFace `all-MiniLM-L6-v2` and searches via ChromaDB, ensuring all answers are grounded in your actual files.

</td>
<td width="50%" valign="top">

### 🧠 System Architecture

```python
from fastapi import FastAPI
from documind import GroqLLM, VectorStore

app = FastAPI(title="DocuMind AI Pro")

@app.post("/extract-invoice")
async def extract_data(doc_id: str, target_schema: dict):
    # Retrieve relevant document chunks
    context = VectorStore.get_context(doc_id)
    
    # Extract structured JSON using Groq
    ai = GroqLLM(model="llama-3.1-70b")
    result = await ai.extract_json(context, target_schema)
    
    return {"status": "success", "data": result}
```
</td>
</tr>
</table>

---

### 🚀 Key Architectures & Pipelines

| Feature | Technical Implementation | Business Impact |
| :--- | :--- | :--- |
| **Full-Stack SaaS Hub** | `React`, `FastAPI`, `Supabase` | Delivers a scalable, secure enterprise platform featuring real-time interactive tools and unified plan management. |
| **Instant Data Extraction** | `Groq JSON Mode`, `LLMs` | Automates complex data-entry pipelines, turning raw PDFs into structured Excel/CSV data instantly. |
| **Context-Aware AI Chat** | `RAG`, `ChromaDB`, `HuggingFace` | Engineered conversational agents grounded in custom enterprise knowledge bases, autonomously resolving queries with exact citations. |

---

<table width="100%" style="border: none;">
<tr>
<td width="50%" valign="top">

### 📚 Project Structure

- **`frontend/`**: A highly optimized React + Vite application featuring a modern, flat SaaS UI, real-time streaming, and interactive dashboards.
- **`backend/`**: A robust Python FastAPI server handling authentication, ChromaDB vector indexing, and asynchronous Groq LLM pipelines.

</td>
<td width="50%" valign="top">

### 🎯 Founder & Architect

**Mohan Kumar S**
- *Founder & AI Researcher @ Moh-AI Tech*
- Specializing in building scalable LLM architectures, bridging academic research with production AI, and automating complex workflows with agentic systems.

</td>
</tr>
</table>

---

### 📊 Project Status

<div align="center">
  <img src="https://streak-stats.demolab.com/?user=MohanKumar2002&theme=dark&hide_border=true&background=0D1117" alt="GitHub Streak" />
</div>

<br/>

<div align="center">
  <p><i>"Bridging the gap between raw data and actionable enterprise intelligence."</i></p>
</div>
