from app.database import SessionLocal
from app.models import Usuario
from passlib.context import CryptContext

db = SessionLocal()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
admin = Usuario(nombre="Admin", email="admin@cantina.com", password=pwd.hash("admin123"), es_admin=True)
db.add(admin)
db.commit()
print("Admin creado")
db.close()