CREATE USER 'flaskuser'@'%' IDENTIFIED BY 'flaskpassword';
GRANT ALL PRIVILEGES ON fitness_tracker.* TO 'flaskuser'@'%';
FLUSH PRIVILEGES;
