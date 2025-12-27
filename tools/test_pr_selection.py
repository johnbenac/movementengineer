import unittest

from tools.pr_batch_big_picture import format_pr_selection, parse_pr_selection


class TestPrSelectionParsing(unittest.TestCase):
    def test_single_range(self) -> None:
        self.assertEqual(parse_pr_selection("1-3"), [1, 2, 3])

    def test_single_values(self) -> None:
        self.assertEqual(parse_pr_selection("1,2,3"), [1, 2, 3])

    def test_range_merge(self) -> None:
        parsed = parse_pr_selection("1-5,6-10")
        self.assertEqual(format_pr_selection(parsed), "1-10")

    def test_mixed_values(self) -> None:
        self.assertEqual(parse_pr_selection("1,5,7-9"), [1, 5, 7, 8, 9])

    def test_whitespace(self) -> None:
        self.assertEqual(parse_pr_selection("1, 5, 7 - 9"), [1, 5, 7, 8, 9])

    def test_hash_prefix(self) -> None:
        self.assertEqual(parse_pr_selection("#1,#3-#5"), [1, 3, 4, 5])

    def test_invalid_token(self) -> None:
        with self.assertRaises(ValueError) as context:
            parse_pr_selection("a")
        self.assertIn("a", str(context.exception))

    def test_invalid_range(self) -> None:
        with self.assertRaises(ValueError) as context:
            parse_pr_selection("5-3")
        self.assertIn("5-3", str(context.exception))

    def test_empty(self) -> None:
        with self.assertRaises(ValueError):
            parse_pr_selection("")

    def test_zero(self) -> None:
        with self.assertRaises(ValueError) as context:
            parse_pr_selection("0")
        self.assertIn("0", str(context.exception))

    def test_negative(self) -> None:
        with self.assertRaises(ValueError) as context:
            parse_pr_selection("-1")
        self.assertIn("-1", str(context.exception))


if __name__ == "__main__":
    unittest.main()
