from fastapi import FastAPI

app = FastAPI(title="Support By DV API")

@app.get("/")
def read_root():
    return {"message": "Valar Morghulis. The API is running."}