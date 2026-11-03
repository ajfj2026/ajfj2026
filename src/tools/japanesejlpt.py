import json
import re
from pathlib import Path
from typing import Any

import requests
from pydantic import BaseModel, TypeAdapter
from selectolax.lexbor import LexborHTMLParser


class Answer(BaseModel):
    text: str


class Question(BaseModel):
    name: str
    text: str
    acceptedAnswer: Answer
    suggestedAnswer: list[Answer]


QuestionList = TypeAdapter(list[Question])


def scrap_questions(level: str, quiz_number: int) -> list[Question]:
    url = f"https://www.japanesejlpt.com/fr/apprendre-le-japonais/tests-kanji-jlpt-{level.lower()}/{quiz_number + 1}/"
    print(f"GET {url}")
    response = requests.get(url)
    parser = LexborHTMLParser(response.text)
    script = parser.css_first('script[type="application/ld+json"]')
    assert script is not None
    obj = json.loads(script.text())
    return QuestionList.validate_python(obj["@graph"][0]["hasPart"])


def convert_questions(level: str, questions: list[Question]) -> list[Any]:
    result = []
    for i, q in enumerate(questions):
        answers = [a.text for a in q.suggestedAnswer]
        kanjis = list(set(re.findall(r"[\u4e00-\u9fff]", q.text + "".join(answers))))
        result.append(
            {
                "id": f"{level}-{i + 1:04}",
                "level": level,
                "context": q.name,
                "question": q.text,
                "answers": answers,
                "kanjis": kanjis,
                "correct": answers.index(q.acceptedAnswer.text),
            }
        )
    return result


def main() -> None:
    n5 = [q for i in range(80) for q in scrap_questions("N5", i)]
    n4 = [q for i in range(54) for q in scrap_questions("N4", i)]

    obj = []
    obj.extend(convert_questions("N5", n5))
    obj.extend(convert_questions("N4", n4))

    output_dir = Path("data/japanesejlpt")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir.joinpath("questions.json")
    with output_file.open("w", encoding="utf-8") as fp:
        json.dump(obj, fp, indent=2, ensure_ascii=False)

    print(f"Wrote {output_file}")
