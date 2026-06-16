from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.sessions import router as sessions_router


app = FastAPI(title="AI HR Interview Bot")

# Add CORS middleware for web app access
# Change to localhost:3000 and localhost:3001 for local run.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        # "https://d2aacj83qbzrx4.cloudfront.net",
        # "https://d2se2hkbe6np2y.cloudfront.net",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(sessions_router, prefix="/api/v1")
