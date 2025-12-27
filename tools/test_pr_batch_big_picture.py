import argparse
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from pr_batch_big_picture import format_pr_selection, parse_pr_selection


class TestPrSelectionParsing(unittest.TestCase):
    def test_range(self) -> None:
        self.assertEqual(parse_pr_selection("1-10"), list(range(1, 11)))

    def test_commas(self) -> None:
        self.assertEqual(parse_pr_selection("1,2,3"), [1, 2, 3])

    def test_merge_ranges(self) -> None:
        self.assertEqual(format_pr_selection(parse_pr_selection("1-5,6-10")), "1-10")

    def test_mixed(self) -> None:
        self.assertEqual(parse_pr_selection("1,5,7-9"), [1, 5, 7, 8, 9])

    def test_whitespace(self) -> None:
        self.assertEqual(parse_pr_selection("1, 5, 7 - 9"), [1, 5, 7, 8, 9])

    def test_hash_prefix(self) -> None:
        self.assertEqual(parse_pr_selection("#1,#3-#5"), [1, 3, 4, 5])

    def test_invalid_tokens(self) -> None:
        for value in ["a", "1-b", "5-3", "", "0", "-1"]:
            with self.subTest(value=value):
                with self.assertRaises(argparse.ArgumentTypeError):
                    parse_pr_selection(value)


if __name__ == "__main__":
    unittest.main()
