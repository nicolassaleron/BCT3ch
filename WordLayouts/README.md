# Word Layouts

# Overview

This document provides dos and don'ts for designing word layouts in Business Central.
This document mostly leverage the existing features of Word that might be unknown to some users, but can be very helpful in designing word layouts.

# How to create a table with dynamic lines?


1. In your AL code, create a new dataitem in your report dataset. In this example, the dataitem is cased on the temporary table `Name/Value Buffer`.

    ![How to create a table with dynamic lines?](CreateTableDynamicLines-0.png)

2. Before this dataitem is emitted in the dataset, fill the temporary table with the values you want to display in your table.

    ![How to create a table with dynamic lines?](CreateTableDynamicLines-1.png)

3. Finally, in your Word layout, insert a table and with on line which will be dynamically repeated according to the number of records in your temporary table.

    ![How to create a table with dynamic lines?](CreateTableDynamicLines-2.png)

# How to keep an entire table on the same page?

1. Select the entire table by clicking the move handle at the top left corner of the table.
2. In the ribbon, click on the arrow at the bottom right of the **Paragraph** section to open the Paragraph dialog box.
3. Go to the **Line and Page Breaks** tab.
4. Make sure to check the **Keep with next** option. This will ensure that the selected table stays on the same page as the following content.

    ![How to keep an entire table on the same page?](KeepTableSamePage-0.png)

# How to create conditional labels?

You cannot set conditions directly on labels in Word, but you can achieve a similar effect by dynamically emitting a different label based on your conditions in AL code.

# How to handle different page headers in the same document?

You can easily distinguish a different header on the first page of your document by using the **Different First Page** option in the Header & Footer Tools Design tab. This allows you to have a unique header on the first page, while the rest of the pages can share a common header.

![How to handle different page headers in the same document?](HandleDifferentPageHeaders-0.png)

# How to alternate line colors in a table?

1. Select the rows of your table that you want to apply alternating colors to.
2. In the ribbon, click on the **Table Design** tab.
3. Make sure you enabled the **Banded Rows** option in the Table Styles Options group. This will apply alternating colors to the selected rows, making it easier to read and visually appealing.

    ![How to alternate line colors in a table?](AlternateLineColorsInTable-0.png)

4. You can further customize the colors used for the banded rows by selecting a different table style from the Table Styles gallery or by modifying the existing style to suit your preferences.

    ![How to alternate line colors in a table?](AlternateLineColorsInTable-1.png)

# How to repeat table headers on each page?

1. Select the header row(s) of your table that you want to repeat on each page.
2. Right-click on the selected row(s) and choose **Table Properties** from the context menu.
3. In the Table Properties dialog box, go to the **Row** tab.
4. Make sure to check the **Repeat as header row at the top of each page** option. This will ensure that the selected header row(s) are repeated at the top of each page when the table spans multiple pages.

    ![How to repeat table headers on each page?](RepeatTableHeadersOnEachPage-0.png)

# How to make sure each row of a table has the same height?

This case typically happens when you have two tables next to each other and you want the lines to be aligned. To achieve this, you can set a fixed height for the rows in both tables.

1. Select the rows of your table that you want to have the same height.
2. In the ribbon, click on the **Table Layout** tab.
3. In the Row tab, set a specific value for the **Height** option and make sure to select **Exactly** from the dropdown menu next to it. This will ensure that all selected rows have the same fixed height.

    ![How to make sure each row of a table has the same height?](SameHeightTableRows-0.png)

# Dos and Don'ts

| Dos                                               | Don'ts                                                                                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use Styles to maintain consistency in formatting. | Avoid using the Font and Paragraph formatting options directly on the content, as it can lead to inconsistent formatting and make it harder to maintain the document. |
