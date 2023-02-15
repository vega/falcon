""" Backend server for the frontend app 
This file contains the endpoints that can be called via HTTP
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles

BACKEND_HOST = "localhost"
BACKEND_PORT = 8000
FRONTEND_HOST = "localhost"
FRONTEND_PORT = 5173

app = FastAPI()

# without this, the frontend errors out
# when making requests to the backend
FRONTEND_URL = f"http://{FRONTEND_HOST}:{FRONTEND_PORT}"
origins = [
    FRONTEND_URL,
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Item(BaseModel):
    name: str
    price: float


class ResponseMessage(BaseModel):
    message: str


@app.post("/items/", response_model=ResponseMessage)
async def create_item(item: Item):
    return {"message": "item received"}


@app.get("/items/", response_model=list[Item])
async def get_items():
    return [
        {"name": "Plumbus", "price": 3},
        {"name": "Portal Gun", "price": 9001},
    ]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, port=BACKEND_PORT, host=BACKEND_HOST)
