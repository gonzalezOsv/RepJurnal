from sqlalchemy import create_engine, text

engine = create_engine('mysql+pymysql://flaskuser:flaskpassword@localhost/fitness_tracker')
connection = engine.connect()
result = connection.execute(text("SHOW TABLES;"))
for row in result:
    print(row)
connection.close()
