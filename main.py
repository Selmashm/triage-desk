import json
import os
import sqlite3
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import InferenceClient
from pydantic import BaseModel, Field


# ==================================================
# SETUP
# ==================================================

load_dotenv()

app = FastAPI(title="Triage Desk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HF_TOKEN = os.getenv("HF_TOKEN")

if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN is missing from the .env file")

client = InferenceClient(token=HF_TOKEN)

MODEL = "Qwen/Qwen2.5-72B-Instruct"

DATABASE = "triage.db"


# ==================================================
# DATABASE
# ==================================================

def init_database():
    connection = sqlite3.connect(DATABASE)

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            category TEXT NOT NULL,
            urgency TEXT NOT NULL,
            suggested_reply TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    connection.commit()
    connection.close()


init_database()


# ==================================================
# REQUEST MODEL
# ==================================================

class Complaint(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=5000
    )


# ==================================================
# AI ANALYSIS
# ==================================================

def analyse_with_ai(message: str):

    prompt = f"""
You are a professional customer service triage assistant.

Your job is to analyse the customer's complaint and classify it.

Return ONLY valid JSON.

Do not include:
- Markdown
- ```json
- ``` 
- Explanations outside the JSON

Use exactly this structure:

{{
    "category": "Delivery",
    "urgency": "High",
    "suggested_reply": "Your suggested customer service reply"
}}

The category MUST be exactly one of:

- Delivery
- Payment
- Product
- Account
- Complaint
- Other

The urgency MUST be exactly one of:

- Low
- Medium
- High

The suggested reply should:
- Be professional
- Be polite
- Show empathy
- Directly address the customer's issue
- Be concise
- Ask for relevant information when necessary

Customer complaint:

{message}
"""

    try:

        response = client.chat_completion(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=300
        )

        content = response.choices[0].message.content.strip()

        # Remove markdown code fences if returned by the AI
        if content.startswith("```"):
            content = content.replace("```json", "")
            content = content.replace("```", "")
            content = content.strip()

        result = json.loads(content)

        # ------------------------------------------
        # Validate fields
        # ------------------------------------------

        required_fields = [
            "category",
            "urgency",
            "suggested_reply"
        ]

        for field in required_fields:

            if field not in result:
                raise ValueError(
                    f"AI response is missing '{field}'"
                )

        # ------------------------------------------
        # Validate category
        # ------------------------------------------

        allowed_categories = [
            "Delivery",
            "Payment",
            "Product",
            "Account",
            "Complaint",
            "Other"
        ]

        if result["category"] not in allowed_categories:

            raise ValueError(
                "AI returned an invalid category"
            )

        # ------------------------------------------
        # Validate urgency
        # ------------------------------------------

        allowed_urgencies = [
            "Low",
            "Medium",
            "High"
        ]

        if result["urgency"] not in allowed_urgencies:

            raise ValueError(
                "AI returned an invalid urgency level"
            )

        return result

    except json.JSONDecodeError:

        print("AI returned invalid JSON:", content)

        raise HTTPException(
            status_code=502,
            detail="The AI service returned an invalid response."
        )

    except HTTPException:

        raise

    except Exception as error:

        print("AI error:", error)

        raise HTTPException(
            status_code=502,
            detail="The AI service is currently unavailable."
        )


# ==================================================
# ANALYSE ENDPOINT
# ==================================================

@app.post("/api/analyse")
def analyse_complaint(complaint: Complaint):

    message = complaint.message.strip()

    if not message:

        raise HTTPException(
            status_code=422,
            detail="Message cannot be empty."
        )

    # ------------------------------------------
    # Analyse using AI
    # ------------------------------------------

    result = analyse_with_ai(message)

    # ------------------------------------------
    # Save to database
    # ------------------------------------------

    connection = sqlite3.connect(DATABASE)

    connection.execute(
        """
        INSERT INTO analyses
        (
            message,
            category,
            urgency,
            suggested_reply,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            message,
            result["category"],
            result["urgency"],
            result["suggested_reply"],
            datetime.now().isoformat()
        )
    )

    connection.commit()
    connection.close()

    # ------------------------------------------
    # Return result to frontend
    # ------------------------------------------

    return {
        "message": message,
        "category": result["category"],
        "urgency": result["urgency"],
        "suggested_reply": result["suggested_reply"]
    }


# ==================================================
# HISTORY ENDPOINT
# ==================================================

@app.get("/api/history")
def get_history():

    connection = sqlite3.connect(DATABASE)

    connection.row_factory = sqlite3.Row

    rows = connection.execute(
        """
        SELECT
            id,
            message,
            category,
            urgency,
            suggested_reply,
            created_at
        FROM analyses
        ORDER BY id DESC
        """
    ).fetchall()

    connection.close()

    return {
        "history": [dict(row) for row in rows]
    }


# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/")
def root():

    return {
        "message": "Triage Desk API is running"
    }