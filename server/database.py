class Database:
  _instance = None

  def __new__(cls):
    if cls._instance is None:
      cls._instance = super().__new__(cls)
      cls._instance.db = mysql.connector.connect(
        host="db",
        user="splitbill",
        password="splitbill",
        database="splitbill"
      )
    return cls._instance

  def get_db(self):
    return self.db