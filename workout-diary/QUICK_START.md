# ⚡ Quick Start Guide

## 🚀 Run Locally (1 Command)

### Windows:
```powershell
cd workout-diary
.\setup-local.ps1
```

### Mac/Linux:
```bash
cd workout-diary
chmod +x setup-local.sh
./setup-local.sh
```

**Open:** http://localhost:5000

**Login:** Username: `tom101` | Password: `vL5MYe7HdD4bhmY##`

---

## 📋 Common Commands

| Action | Command |
|--------|---------|
| **Start** | `docker-compose up -d` |
| **Stop** | `docker-compose down` |
| **View Logs** | `docker-compose logs -f web` |
| **Restart** | `docker-compose restart web` |
| **Reset DB** | `docker-compose down -v` |

---

## 🔧 Troubleshooting

**Port 5000 in use?**
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Not working?**
```powershell
docker-compose down -v
.\setup-local.ps1
```

---

## 📚 Full Documentation

- **Local Setup:** `LOCAL_SETUP.md`
- **Railway Deploy:** `RAILWAY_DEPLOYMENT_GUIDE.md`
- **Production:** `RAILWAY_COMPLETE_SETUP.md`

---

**Need help?** Check `LOCAL_SETUP.md` for detailed instructions!

