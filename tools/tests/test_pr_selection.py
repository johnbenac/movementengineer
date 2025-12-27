import unittest
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pr_batch_big_picture as pr_batch


class TestPrSelectionParsing(unittest.TestCase):
    def test_range_selection(self) -> None:
        self.assertEqual(pr_batch.parse_pr_selection("1-10"), list(range(1, 11)))

    def test_list_selection(self) -> None:
        self.assertEqual(pr_batch.parse_pr_selection("1,2,3"), [1, 2, 3])

    def test_ranges_canonicalize(self) -> None:
        prs = pr_batch.parse_pr_selection("1-5,6-10")
        self.assertEqual(pr_batch.format_pr_selection(prs), "1-10")

    def test_mixed_selection(self) -> None:
        self.assertEqual(pr_batch.parse_pr_selection("1,5,7-9"), [1, 5, 7, 8, 9])

    def test_whitespace_variations(self) -> None:
        self.assertEqual(pr_batch.parse_pr_selection("1, 2, 4 - 6"), [1, 2, 4, 5, 6])

    def test_hash_prefixes(self) -> None:
        self.assertEqual(pr_batch.parse_pr_selection("#1,#3-#5"), [1, 3, 4, 5])

    def test_invalid_token(self) -> None:
        with self.assertRaises(pr_batch.SelectionParseError):
            pr_batch.parse_pr_selection("a")

    def test_invalid_range_token(self) -> None:
        with self.assertRaises(pr_batch.SelectionParseError):
            pr_batch.parse_pr_selection("1-b")

    def test_inverted_range(self) -> None:
        with self.assertRaises(pr_batch.SelectionParseError):
            pr_batch.parse_pr_selection("5-3")

    def test_empty_input(self) -> None:
        with self.assertRaises(pr_batch.SelectionParseError):
            pr_batch.parse_pr_selection("")

    def test_zero_and_negative(self) -> None:
        with self.assertRaises(pr_batch.SelectionParseError):
            pr_batch.parse_pr_selection("0")
        with self.assertRaises(pr_batch.SelectionParseError):
            pr_batch.parse_pr_selection("-1")


if __name__ == "__main__":
    unittest.main()
