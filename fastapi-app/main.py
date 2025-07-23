from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.responses import RedirectResponse

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import os
import jwt
import bcrypt
import mysql.connector

from utils import send_email

# Load environment variables
from dotenv import load_dotenv

load_dotenv()

# FastAPI app
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Database connection
def get_db():
    return mysql.connector.connect(
        host=os.getenv("HOST", "localhost"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
        database="lab_inventory",
    )


# JWT config
SECRET = os.getenv("JWT_SECRET", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_EXPIRE_MINUTES = 120


# Pydantic models
class UserRegister(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class ComponentIn(BaseModel):
    name: str
    category: str
    quantity: int


class CheckoutIn(BaseModel):
    component_id: int
    quantity: int


class TokenData(BaseModel):
    user_id: int
    username: str
    role: str
    exp: float


# Utils: auth dependencies
def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)


def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return TokenData(**payload)
    except jwt.PyJWTError:
        raise HTTPException(status_code=403, detail="Invalid token")


def get_current_user(
    token: str = Depends(lambda: None), authorization: str = Depends(lambda: None)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing credentials")
    scheme, _, param = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid auth scheme")
    return decode_token(param)


def admin_required(user: TokenData = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return user


@app.get("/")
async def docs_redirect():
    """Api's base route that displays the information created above in the ApiInfo
    section."""
    return RedirectResponse(url="/docs")


# Endpoints
@app.post("/auth/register")
def register(u: UserRegister):
    db = get_db()
    cur = db.cursor()
    hashed = bcrypt.hashpw(u.password.encode(), bcrypt.gensalt())
    try:
        cur.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
            (u.username, u.email, hashed),
        )
        db.commit()
    except mysql.connector.IntegrityError:
        raise HTTPException(status_code=400, detail="Username or email exists")
    return {"message": "User registered successfully"}


@app.post("/auth/login")
def login(u: UserLogin):
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM users WHERE username=%s", (u.username,))
    user = cur.fetchone()
    if not user or not bcrypt.checkpw(u.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(
        {"user_id": user["id"], "username": user["username"], "role": user["role"]}
    )
    return {"token": token}


@app.post("/components/add")
def add_component(c: ComponentIn, user: TokenData = Depends(get_current_user)):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO components (name, category, quantity) VALUES (%s, %s, %s)",
        (c.name, c.category, c.quantity),
    )
    db.commit()
    return {"message": "Component added"}


@app.get("/components", response_model=List[dict])
def list_components():
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM components")
    return cur.fetchall()


@app.get("/components/dashboard", response_model=List[dict])
def dashboard_components(user: TokenData = Depends(get_current_user)):
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM components ORDER BY category, name")
    return cur.fetchall()


@app.post("/checkout")
def create_checkout(c: CheckoutIn, user: TokenData = Depends(get_current_user)):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO checkouts (user_id, component_id, quantity, status) VALUES (%s, %s, %s, 'requested')",
        (user.user_id, c.component_id, c.quantity),
    )
    db.commit()
    return {"message": "Checkout request submitted"}


@app.get("/checkout/my-requests", response_model=List[dict])
def my_requests(user: TokenData = Depends(get_current_user)):
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute(
        """
        SELECT c.id, comp.name AS component, c.quantity, c.status, c.rejection_reason, c.checkout_date
        FROM checkouts c
        JOIN components comp ON comp.id=c.component_id
        WHERE c.user_id=%s
        ORDER BY c.checkout_date DESC
    """,
        (user.user_id,),
    )
    return cur.fetchall()


@app.get("/admin/pending-checkouts", response_model=List[dict])
def pending_checkouts(user: TokenData = Depends(admin_required)):
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute(
        """
        SELECT c.id, u.username, comp.name AS component, c.quantity, c.checkout_date
        FROM checkouts c
        JOIN users u ON u.id=c.user_id
        JOIN components comp ON comp.id=c.component_id
        WHERE c.status='requested'
        ORDER BY c.checkout_date
    """
    )
    return cur.fetchall()


@app.post("/admin/approve-checkout/{cid}")
def approve_checkout(cid: int, user: TokenData = Depends(admin_required)):
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute(
        """
        SELECT c.component_id, c.quantity, u.username, u.email, comp.name AS component_name
        FROM checkouts c
        JOIN users u ON u.id=c.user_id
        JOIN components comp ON comp.id=c.component_id
        WHERE c.id=%s AND c.status='requested'
    """,
        (cid,),
    )
    req = cur.fetchone()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    cur.execute("SELECT quantity FROM components WHERE id=%s", (req["component_id"],))
    stock = cur.fetchone()["quantity"]
    if stock < req["quantity"]:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    cur.execute(
        "UPDATE components SET quantity=quantity - %s WHERE id=%s",
        (req["quantity"], req["component_id"]),
    )
    cur.execute("UPDATE checkouts SET status='approved' WHERE id=%s", (cid,))
    db.commit()

    send_email(
        to=req["email"],
        subject=f"Component Approved: {req['component_name']}",
        html=f"<p>Hi {req['username']},<br>Your request for {req['quantity']}×{req['component_name']} was approved.</p>",
    )
    # Ideally add send_email(req["email"], ...)
    return {"message": "Approved"}


@app.post("/admin/reject-checkout/{cid}")
def reject_checkout(
    cid: int, reason: Optional[str] = "", user: TokenData = Depends(admin_required)
):
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute(
        """
        SELECT c.quantity, u.username, u.email, comp.name AS component_name
        FROM checkouts c
        JOIN users u ON u.id=c.user_id
        JOIN components comp ON comp.id=c.component_id
        WHERE c.id=%s AND c.status='requested'
    """,
        (cid,),
    )
    req = cur.fetchone()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    cur.execute(
        "UPDATE checkouts SET status='rejected', rejection_reason=%s WHERE id=%s",
        (reason, cid),
    )
    db.commit()

    send_email(
        to=req["email"],
        subject=f"Component Rejected: {req['component_name']}",
        html=f"<p>Hi {req['username']},<br>Your request for {req['quantity']}×{req['component_name']} was rejected.<br>Reason: {reason}</p>",
    )
    return {"message": "Rejected"}


@app.get("/admin/pending-count")
def pending_count(user: TokenData = Depends(admin_required)):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT COUNT(*) AS pending FROM checkouts WHERE status='requested'")
    return {"pending": cur.fetchone()[0]}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=5050, log_level="debug", reload=True)
