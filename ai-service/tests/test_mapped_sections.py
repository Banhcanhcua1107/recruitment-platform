import unittest


from services.structured_parser import build_normalized_json


class MappedSectionsContractTests(unittest.TestCase):
    def test_build_parse_cv_mapping_prompt_emphasizes_classification_only(self):
        from services.cv_parser import build_parse_cv_mapping_prompt

        prompt = build_parse_cv_mapping_prompt(
            {
                "ocr_json": {
                    "name_candidate": "Nguyen Van A",
                    "skills_text": "React, Next.js",
                }
            }
        )

        self.assertIn("Khong sua noi dung", prompt)
        self.assertIn("Khong them du lieu", prompt)
        self.assertIn("Chi phan loai dung section", prompt)
        self.assertIn("candidate", prompt)
        self.assertIn("personal_info", prompt)
        self.assertIn("career_objective", prompt)
        self.assertIn("others", prompt)

    def test_normalize_mapped_sections_returns_full_shape(self):
        from services.mapped_sections import normalize_mapped_sections

        mapped = normalize_mapped_sections(
            {
                "candidate": {"name": "Nguyen Van A", "job_title": "Frontend Developer"},
                "personal_info": {
                    "email": "haidang@example.com",
                    "current_school": "PTIT",
                    "academic_year": "2020-2024",
                },
                "summary": "Frontend developer with React experience",
                "career_objective": {"text": "Become a fullstack engineer"},
                "skills": {
                    "programming_languages": "TypeScript, JavaScript",
                    "frontend": ["React", "Next.js"],
                    "soft_skills": "Communication, Teamwork",
                },
                "languages": [{"name": "English", "proficiency": "IELTS 7.0"}],
                "others": {"unexpected_label": "Hackathon finalist"},
            }
        )

        self.assertEqual(mapped["candidate"]["name"], "Nguyen Van A")
        self.assertEqual(mapped["summary"]["text"], "Frontend developer with React experience")
        self.assertEqual(mapped["career_objective"]["text"], "Become a fullstack engineer")
        self.assertEqual(mapped["skills"]["programming_languages"], ["TypeScript", "JavaScript"])
        self.assertEqual(mapped["skills"]["frontend"], ["React", "Next.js"])
        self.assertEqual(mapped["skills"]["backend"], [])
        self.assertEqual(mapped["skills"]["tools"], [])
        self.assertEqual(mapped["personal_info"]["current_school"], "PTIT")
        self.assertEqual(mapped["personal_info"]["academic_year"], "2020-2024")
        self.assertEqual(mapped["languages"][0]["name"], "English")
        self.assertTrue(mapped["others"])

    def test_mapped_sections_to_structured_data_keeps_summary_and_objective_separate(self):
        from services.mapped_sections import (
            build_empty_mapped_sections,
            mapped_sections_to_structured_data,
        )

        mapped = build_empty_mapped_sections()
        mapped["candidate"]["name"] = "Nguyen Van A"
        mapped["candidate"]["job_title"] = "Frontend Developer"
        mapped["personal_info"]["email"] = "haidang@example.com"
        mapped["summary"]["text"] = "Frontend developer with 3 years of experience"
        mapped["career_objective"]["text"] = "Grow into product-minded fullstack work"
        mapped["skills"]["frontend"] = ["React", "Next.js"]
        mapped["experience"] = [
            {
                "company": "ABC Corp",
                "role": "Frontend Developer",
                "start_date": "2022",
                "end_date": "Present",
                "description": "Built dashboards",
            }
        ]

        structured = mapped_sections_to_structured_data(mapped, raw_text="raw text")

        self.assertEqual(structured["full_name"], "Nguyen Van A")
        self.assertEqual(structured["job_title"], "Frontend Developer")
        self.assertEqual(structured["summary"], "Frontend developer with 3 years of experience")
        self.assertEqual(structured["career_objective"], "Grow into product-minded fullstack work")
        self.assertEqual(structured["profile"]["summary"], "Frontend developer with 3 years of experience")
        self.assertEqual(
            structured["profile"]["career_objective"],
            "Grow into product-minded fullstack work",
        )
        self.assertEqual(structured["skills"], ["React", "Next.js"])
        self.assertEqual(structured["experience"][0]["company"], "ABC Corp")

    def test_build_normalized_json_persists_mapped_sections_and_extra_sections(self):
        from services.mapped_sections import build_empty_mapped_sections, mapped_sections_to_structured_data

        mapped = build_empty_mapped_sections()
        mapped["candidate"]["name"] = "Nguyen Van A"
        mapped["candidate"]["job_title"] = "Frontend Developer"
        mapped["personal_info"]["email"] = "haidang@example.com"
        mapped["personal_info"]["current_school"] = "PTIT"
        mapped["summary"]["text"] = "Short summary"
        mapped["career_objective"]["text"] = "Long-term objective"
        mapped["awards"] = [{"name": "Hackathon Winner", "year": "2024"}]
        mapped["hobbies"] = ["Reading"]
        mapped["others"] = ["Volunteer mentor"]

        processed = {
            "data": mapped_sections_to_structured_data(mapped, raw_text="raw text"),
            "mapped_sections": mapped,
            "document_analysis": {
                "document_type": "cv",
                "level": "junior",
                "role": "frontend",
                "render_folder": "/cv/junior/frontend/",
            },
            "blocks": [{"id": "b1"}],
            "layout_blocks": [{"id": "l1"}],
        }

        normalized = build_normalized_json(processed, {"signals": {"has_avatar_candidate": True}})

        self.assertEqual(normalized["summary"], "Short summary")
        self.assertEqual(normalized["career_objective"], "Long-term objective")
        self.assertEqual(normalized["contacts"]["current_school"], "PTIT")
        self.assertEqual(normalized["mapped_sections"]["candidate"]["name"], "Nguyen Van A")
        self.assertEqual(normalized["awards"][0]["name"], "Hackathon Winner")
        self.assertEqual(normalized["hobbies"], ["Reading"])
        self.assertEqual(normalized["others"], ["Volunteer mentor"])
        self.assertEqual(normalized["document_analysis"]["render_folder"], "/cv/junior/frontend/")

    def test_build_normalized_json_prefers_cleaned_json_and_exposes_correction_log(self):
        from services.mapped_sections import build_empty_mapped_sections, mapped_sections_to_structured_data

        mapped = build_empty_mapped_sections()
        mapped["summary"]["text"] = "ky nang giao tiep tot"
        mapped["skills"]["backend"] = ["node js"]

        cleaned = build_empty_mapped_sections()
        cleaned["summary"]["text"] = "Kỹ năng giao tiếp tốt."
        cleaned["skills"]["backend"] = ["Node.js"]

        processed = {
            "data": mapped_sections_to_structured_data(cleaned, raw_text="raw text"),
            "mapped_sections": mapped,
            "cleaned_json": cleaned,
            "document_analysis": {
                "document_type": "cv",
                "level": "intern",
                "role": "frontend",
                "render_folder": "/cv/intern/frontend/",
            },
            "correction_log": [
                {
                    "field": "summary.text",
                    "before": "ky nang giao tiep tot",
                    "after": "Kỹ năng giao tiếp tốt.",
                    "reason": "corrected OCR/spelling",
                }
            ],
            "blocks": [],
            "layout_blocks": [],
        }

        normalized = build_normalized_json(processed, {"signals": {"has_avatar_candidate": False}})

        self.assertEqual(normalized["summary"], "Kỹ năng giao tiếp tốt.")
        self.assertEqual(normalized["cleaned_json"]["summary"]["text"], "Kỹ năng giao tiếp tốt.")
        self.assertEqual(normalized["skills"], ["Node.js"])
        self.assertEqual(normalized["correction_log"][0]["field"], "summary.text")
        self.assertEqual(normalized["document_analysis"]["level"], "intern")

    def test_build_parser_raw_response_includes_cleaned_json_and_correction_log(self):
        from services.mapped_sections import build_empty_mapped_sections
        from services.structured_parser import build_parser_raw_response

        mapped = build_empty_mapped_sections()
        mapped["summary"]["text"] = "ky nang giao tiep tot"

        cleaned = build_empty_mapped_sections()
        cleaned["summary"]["text"] = "Ká»¹ nÄƒng giao tiáº¿p tá»‘t."

        normalized_json = {
            "mapped_sections": mapped,
            "cleaned_json": cleaned,
            "document_analysis": {
                "document_type": "cv",
                "level": "intern",
                "role": "frontend",
                "render_folder": "/cv/intern/frontend/",
            },
            "correction_log": [
                {
                    "field": "summary.text",
                    "before": "ky nang giao tiep tot",
                    "after": "Ká»¹ nÄƒng giao tiáº¿p tá»‘t.",
                    "reason": "corrected OCR/spelling",
                }
            ],
        }

        parser_raw = build_parser_raw_response(
            {"page_count": 1, "total_blocks": 12},
            normalized_json,
        )

        self.assertEqual(parser_raw["mapped_sections"]["summary"]["text"], "ky nang giao tiep tot")
        self.assertEqual(parser_raw["cleaned_json"]["summary"]["text"], "Ká»¹ nÄƒng giao tiáº¿p tá»‘t.")
        self.assertEqual(parser_raw["correction_log"][0]["field"], "summary.text")
        self.assertEqual(parser_raw["document_analysis"]["render_folder"], "/cv/intern/frontend/")
        self.assertEqual(
            parser_raw["normalized_json"]["cleaned_json"]["summary"]["text"],
            "Ká»¹ nÄƒng giao tiáº¿p tá»‘t.",
        )

    def test_build_non_cv_payload_exposes_empty_cleaned_json_and_correction_log(self):
        from services.ocr_pipeline import _build_non_cv_payload
        from services.ocr_service import OCRPageResult

        payload = _build_non_cv_payload(
            raw_text="Invoice #1001\nCustomer: Nguyen Van A",
            page_results=[OCRPageResult(page=1, image_width=1200, image_height=1600)],
            structured_blocks=[],
            layout_blocks=[],
        )

        self.assertEqual(payload["mapped_sections"]["summary"]["text"], "")
        self.assertEqual(payload["cleaned_json"]["summary"]["text"], "")
        self.assertEqual(payload["correction_log"], [])
        self.assertEqual(payload["document_analysis"]["document_type"], "unknown")
        self.assertEqual(payload["document_analysis"]["render_folder"], "/cv/unknown/unknown/")
        self.assertEqual(payload["layout"]["pages"][0]["page"], 1)

    def test_build_builder_sections_maps_supported_section_types(self):
        from services.mapped_sections import build_builder_sections_from_mapped_sections, build_empty_mapped_sections

        mapped = build_empty_mapped_sections()
        mapped["candidate"]["name"] = "Nguyen Van A"
        mapped["candidate"]["job_title"] = "Frontend Developer"
        mapped["personal_info"]["email"] = "haidang@example.com"
        mapped["summary"]["text"] = "Short summary"
        mapped["career_objective"]["text"] = "Long-term objective"
        mapped["skills"]["frontend"] = ["React", "Next.js"]
        mapped["experience"] = [{"company": "ABC Corp", "role": "Frontend Developer", "description": "Built dashboards"}]
        mapped["education"] = [{"school": "PTIT", "major": "Information Technology"}]
        mapped["projects"] = [{"name": "Hiring Dashboard", "technologies": ["React", "Node.js"]}]
        mapped["certificates"] = [{"name": "AWS CCP", "year": "2024"}]
        mapped["awards"] = [{"name": "Hackathon Winner", "year": "2024"}]
        mapped["languages"] = [{"name": "English", "proficiency": "IELTS 7.0"}]
        mapped["hobbies"] = ["Reading"]
        mapped["others"] = ["Volunteer mentor"]

        sections = build_builder_sections_from_mapped_sections(mapped)
        section_types = [section["type"] for section in sections]

        self.assertIn("header", section_types)
        self.assertIn("personal_info", section_types)
        self.assertIn("summary", section_types)
        self.assertIn("experience_list", section_types)
        self.assertIn("education_list", section_types)
        self.assertIn("skill_list", section_types)
        self.assertIn("project_list", section_types)
        self.assertIn("certificate_list", section_types)
        self.assertIn("award_list", section_types)
        self.assertIn("rich_outline", section_types)


if __name__ == "__main__":
    unittest.main()
