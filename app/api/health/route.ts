export async function GET() {
  return Response.json({
    status: 'healthy',
    app: 'DocuMind AI Pro',
    version: '3.0.0',
    built_by: 'MOH AI TECH · Namakkal, Tamil Nadu',
    founder: 'Mohan Kumar S',
    timestamp: new Date().toISOString(),
  })
}
