from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Categoria, Producto, Usuario
from app.config import settings
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# ===== AUTH =====
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

class ProductoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    precio: float
    categoria_id: int
    disponible: bool = True

def crear_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verificar_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        if not usuario or not usuario.es_admin:
            raise HTTPException(status_code=403, detail="No autorizado")
        return usuario
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ===== ENDPOINTS PÚBLICOS =====
@router.get("/categorias")
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(Categoria).filter(Categoria.activa == True).all()

@router.get("/productos")
def listar_productos(db: Session = Depends(get_db)):
    return db.query(Producto).filter(Producto.disponible == True).all()

@router.get("/productos/{categoria_id}")
def productos_por_categoria(categoria_id: int, db: Session = Depends(get_db)):
    return db.query(Producto).filter(
        Producto.categoria_id == categoria_id,
        Producto.disponible == True
    ).all()

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    if not usuario or not pwd_context.verify(form_data.password, usuario.password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = crear_token({"sub": usuario.email})
    return {"access_token": token, "token_type": "bearer"}

# ===== ENDPOINTS ADMIN =====
@router.get("/admin/productos")
def admin_listar_productos(db: Session = Depends(get_db), usuario=Depends(verificar_token)):
    return db.query(Producto).all()

@router.post("/admin/productos")
def admin_crear_producto(producto: ProductoCreate, db: Session = Depends(get_db), usuario=Depends(verificar_token)):
    nuevo = Producto(**producto.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.put("/admin/productos/{id}")
def admin_editar_producto(id: int, producto: ProductoCreate, db: Session = Depends(get_db), usuario=Depends(verificar_token)):
    p = db.query(Producto).filter(Producto.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for key, value in producto.dict().items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return p

@router.delete("/admin/productos/{id}")
def admin_eliminar_producto(id: int, db: Session = Depends(get_db), usuario=Depends(verificar_token)):
    p = db.query(Producto).filter(Producto.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    db.delete(p)
    db.commit()
    return {"mensaje": "Producto eliminado"}