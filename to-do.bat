@echo off
cd /d "C:\Users\nahid\Desktop\my-todo-app"
start "" http://localhost:3000
start /min cmd /c "npm start"
exit
