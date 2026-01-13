# BE-Order-Alone
나홀로 주문 서버입니다.

## Local Run

```bash
pip install -r requirements.txt
export MONGO_DETAILS="mongodb://localhost:27017"
uvicorn main:app --reload
```
