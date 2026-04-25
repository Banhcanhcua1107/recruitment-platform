import unittest


class CVContentCleanerTests(unittest.TestCase):
    def test_finalize_cleaned_result_normalizes_output_and_builds_diff_log(self):
        from services.cv_content_cleaner import finalize_cleaned_result
        from services.mapped_sections import normalize_mapped_sections

        original = normalize_mapped_sections(
            {
                "summary": {"text": "ky nang giao tiep tot"},
                "skills": {
                    "backend": ["node js", "nestjs"],
                },
                "projects": [
                    {
                        "name": "he thong quan ly kho",
                        "description": "xay dung api quan ly don hang",
                        "technologies": ["node js", "postgre sql"],
                    }
                ],
            }
        )

        cleaned = finalize_cleaned_result(
            original,
            {
                "correction_log": [
                    {
                        "field": "summary.text",
                        "before": "ky nang giao tiep tot",
                        "after": "Kỹ năng giao tiếp tốt.",
                        "reason": "corrected OCR/spelling",
                    },
                    {
                        "field": "skills.backend[0]",
                        "before": "node js",
                        "after": "Node.js",
                        "reason": "standardized technology naming",
                    },
                ],
                "cleaned_json": {
                    "summary": {"text": "Kỹ năng giao tiếp tốt."},
                    "skills": {
                        "backend": ["Node.js", "NestJS"],
                    },
                    "projects": [
                        {
                            "name": "Hệ thống quản lý kho",
                            "description": "Xây dựng API quản lý đơn hàng.",
                            "technologies": ["Node.js", "PostgreSQL"],
                        }
                    ],
                },
            },
        )

        self.assertEqual(cleaned["cleaned_json"]["summary"]["text"], "Kỹ năng giao tiếp tốt.")
        self.assertEqual(cleaned["cleaned_json"]["skills"]["backend"], ["Node.js", "NestJS"])
        self.assertEqual(cleaned["cleaned_json"]["projects"][0]["technologies"], ["Node.js", "PostgreSQL"])
        self.assertTrue(any(entry["field"] == "summary.text" for entry in cleaned["correction_log"]))
        self.assertTrue(any(entry["field"] == "skills.backend[0]" for entry in cleaned["correction_log"]))
        self.assertTrue(any(entry["field"] == "projects[0].description" for entry in cleaned["correction_log"]))

    def test_finalize_postprocessed_result_infers_document_analysis_and_returns_clean_sections(self):
        from services.cv_content_cleaner import finalize_postprocessed_result
        from services.mapped_sections import normalize_mapped_sections

        original = normalize_mapped_sections(
            {
                "candidate": {"job_title": "Frontend Intern"},
                "summary": {"text": "frontend intern with react"},
                "skills": {
                    "frontend": ["react js"],
                },
                "education": [
                    {
                        "school": "PTIT",
                        "major": "Information Technology",
                    }
                ],
            }
        )

        postprocessed = finalize_postprocessed_result(
            original,
            {
                "mapped_sections": {
                    "summary": {"text": "Frontend intern with React."},
                    "skills": {
                        "frontend": ["React"],
                    },
                },
                "correction_log": [
                    {
                        "field": "summary.text",
                        "before": "frontend intern with react",
                        "after": "Frontend intern with React.",
                        "reason": "corrected OCR/spelling",
                    }
                ],
            },
        )

        self.assertEqual(postprocessed["mapped_sections"]["summary"]["text"], "Frontend intern with React.")
        self.assertEqual(postprocessed["mapped_sections"]["skills"]["frontend"], ["React"])
        self.assertEqual(postprocessed["document_analysis"]["document_type"], "cv")
        self.assertEqual(postprocessed["document_analysis"]["level"], "intern")
        self.assertEqual(postprocessed["document_analysis"]["role"], "frontend")
        self.assertEqual(postprocessed["document_analysis"]["render_folder"], "/cv/intern/frontend/")
        self.assertTrue(any(entry["field"] == "summary.text" for entry in postprocessed["correction_log"]))


if __name__ == "__main__":
    unittest.main()
