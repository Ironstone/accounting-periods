# Accounting periods

In accounting, each year can be divided into a number of "periods". For this exercise, treat each period as one calendar month.

Write a solution that generates a potentially infinite list of periods from a given start date.

For each period, show its period number, from 1 to 12. Period 12 is the one that ends the financial year, which for this exercise is 30 June.

Group the generated periods by financial year, and show the number of days in each financial year.

For example, if the start date is `2020-07-02`, the first result should have a start date of `2020-07-01`, an end date of `2020-07-31` and a period number of 1.

## Sample output

```
Financial Year 2020-2021:
Days: 365
Periods:

Start        End          Period Number
2020-07-01   2020-07-31   1
2020-08-01   2020-08-31   2
2020-09-01   2020-09-30   3
2020-10-01   2020-10-31   4
2020-11-01   2020-11-30   5
2020-12-01   2020-12-31   6
2021-01-01   2021-01-31   7
2021-02-01   2021-02-28   8
2021-03-01   2021-03-31   9
2021-04-01   2021-04-30   10
2021-05-01   2021-05-31   11
2021-06-01   2021-06-30   12

Financial Year 2021-2022:
Days: 365
Periods:

Start        End          Period Number
2021-07-01   2021-07-31   1
2021-08-01   2021-08-31   2
...
```
