from fastapi import FastAPI, APIRouter

app = FastAPI()
router = APIRouter()

@router.get("/conversations")
async def list_conversations():
    return {"message": "list conversations"}

@router.get("/conversations/{conversation_id}/messages")
async def list_messages(conversation_id: str):
    return {"message": f"list messages for {conversation_id}"}

@router.delete("/messages/{message_id}")
async def delete_message(message_id: str):
    return {"message": f"delete message {message_id}"}

@router.post("/messages/{message_id}/regenerate")
async def regenerate_message(message_id: str):
    return {"message": f"regenerate message {message_id}"}

app.include_router(router, prefix="/api/chat")

if __name__ == "__main__":
    import uvicorn
    # Print routes
    print("\n===== Registered routes =====")
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = ','.join(route.methods) if route.methods else 'N/A'
            print(f"{methods:10} {route.path}")
    print("=============================\n")

    uvicorn.run(app, host="127.0.0.1", port=8001)
