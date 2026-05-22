# Navigate (Find Entries) and Posting Preview Navigate

## Purpose
This pattern explains how to integrate a custom posted table into:

- The **Navigate** action (also called **Find Entries**)
- The **Posting Preview** flow so previewed entries can be displayed and opened

The goal is to make custom entries behave like standard Business Central entries during investigation and preview.

## When to Use This Pattern
Use this pattern when you have a custom posted table (for example, a ledger, archive, or posting result table) and you want users to:

- Discover records through **Navigate** by document number, posting date, or external document number
- Open related records directly from Navigate results
- See and open previewed records when using **Preview Posting**

## Architecture Overview
The implementation is split into two codeunits:

1. `Navigate` subscriber codeunit (Page `Navigate` events)
2. `Posting Preview Event Handler` subscriber codeunit (Codeunit `Posting Preview Event Handler` events)

You can use `SingleInstance = true` in both when maintaining in-memory temporary state across events.

---

## Part 1: Extend Find Entries (Navigate)

### 1. Add an Event Subscriber on `OnAfterNavigateFindRecords`
Subscribe to:

- Object: Page `Navigate`
- Event: `OnAfterNavigateFindRecords`

Use this event to count matching records in your custom table and register that count into `Document Entry`.

Core call:

```al
DocumentEntry.InsertIntoDocEntry(Database::"Your Posted Table", DocEntryType::" ", DocTableName, MatchingCount);
```

Notes:

- `DocTableName` is typically your table caption.
- `DocEntryType` can be blank (`" "`) for many custom scenarios.
- Apply all relevant filters before calling `Count()`.

### 2. Filter Your Custom Table Using Navigate Filters
In your internal finder procedure:

- Apply `DocNoFilter` on your document number field
- Apply `PostingDateFilter` on posting date
- Apply `ExtDocNo` on external/vendor/customer document field when relevant

Example filter mapping:

```al
if DocNoFilter <> '' then
    YourEntry.SetFilter("Document No.", DocNoFilter);
if ExtDocNo <> '' then
    YourEntry.SetFilter("External Document No.", ExtDocNo);
if PostingDateFilter <> '' then
    YourEntry.SetFilter("Posting Date", PostingDateFilter);
```

### 3. Respect Security and Permissions
Before counting records:

- Set `SecurityFiltering(SecurityFilter::Filtered)`
- Check `ReadPermission()`

This avoids leaking data in counts for users without access.

### 4. Open the Correct Page on `OnAfterShowRecords`
Subscribe to:

- Object: Page `Navigate`
- Event: `OnAfterShowRecords`

Use `DocumentEntry."Table ID"` to decide which page to open.

Example:

```al
case DocumentEntry."Table ID" of
    Database::"Your Posted Table":
        Page.Run(0, YourEntry);
end;
```

`Page.Run(0, Rec)` lets BC resolve the default lookup/list page for the record.

### 5. Recommended Navigate Template

```al
codeunit 50xxx "My Navigate"
{
    SingleInstance = true;

    var
        [SecurityFiltering(SecurityFilter::Filtered)]
        MyPostedEntry: Record "My Posted Entry";

    [EventSubscriber(ObjectType::Page, Page::Navigate, OnAfterNavigateFindRecords, '', false, false)]
    local procedure OnAfterNavigateFindRecords(var Sender: Page Navigate; var DocumentEntry: Record "Document Entry"; DocNoFilter: Text; PostingDateFilter: Text; var NewSourceRecVar: Variant; ExtDocNo: Code[250]; HideDialog: Boolean)
    begin
        AddMyEntries(DocumentEntry, DocNoFilter, PostingDateFilter, ExtDocNo);
    end;

    [EventSubscriber(ObjectType::Page, Page::Navigate, OnAfterShowRecords, '', false, false)]
    local procedure OnAfterShowRecords(var Sender: Page Navigate; var DocumentEntry: Record "Document Entry"; DocNoFilter: Text; PostingDateFilter: Text; ItemTrackingSearch: Boolean; ContactType: Enum "Navigate Contact Type"; ContactNo: Code[250]; ExtDocNo: Code[250])
    begin
        case DocumentEntry."Table ID" of
            Database::"My Posted Entry":
                Page.Run(0, MyPostedEntry);
        end;
    end;

    local procedure AddMyEntries(var DocumentEntry: Record "Document Entry"; DocNoFilter: Text; PostingDateFilter: Text; ExtDocNo: Code[250])
    var
        DocEntryType: Enum "Document Entry Document Type";
    begin
        MyPostedEntry.SecurityFiltering(SecurityFilter::Filtered);

        if not MyPostedEntry.ReadPermission() then
            exit;

        MyPostedEntry.Reset();
        if DocNoFilter <> '' then
            MyPostedEntry.SetFilter("Document No.", DocNoFilter);
        if PostingDateFilter <> '' then
            MyPostedEntry.SetFilter("Posting Date", PostingDateFilter);
        if ExtDocNo <> '' then
            MyPostedEntry.SetFilter("External Document No.", ExtDocNo);

        DocumentEntry.InsertIntoDocEntry(Database::"My Posted Entry", DocEntryType::" ", CopyStr(MyPostedEntry.TableCaption(), 1, 100), MyPostedEntry.Count());
    end;
}
```

---

## Part 2: Add Navigate Support Inside Posting Preview

### Goal
When users run **Preview Posting**, your custom posted table should appear in preview entries and open your preview page.

### 1. Keep a Temporary Buffer of Inserted Entries
Create a temporary record variable for your posted table.

```al
TempMyPostedEntry: Record "My Posted Entry" temporary;
```

Clear it at posting start (for example from your posting codeunit `OnBeforePost` event):

```al
TempMyPostedEntry.Reset();
TempMyPostedEntry.DeleteAll(false);
```

### 2. Capture Real Inserts and Copy to Temporary Buffer
Subscribe to table `OnAfterInsertEvent` of your posted table.

- Ignore temporary inserts (`if Rec.IsTemporary() then exit;`)
- Copy inserted record to temp buffer
- Optionally mask sensitive fields (for example document number)

Example:

```al
TempMyPostedEntry := Rec;
TempMyPostedEntry."Document No." := '***';
TempMyPostedEntry.Insert();
```

### 3. Expose Temporary Data Through `OnGetEntries`
Subscribe to event handler codeunit event:

- Object: Codeunit `Posting Preview Event Handler`
- Event: `OnGetEntries`

When `TableNo` equals your table, return the temp table via `RecRef.GetTable(...)`.

### 4. Open Your Preview Page Through `OnAfterShowEntries`
Subscribe to:

- Object: Codeunit `Posting Preview Event Handler`
- Event: `OnAfterShowEntries`

Open your preview page for your table when selected.

### 5. Register Your Table in Preview Document Entries
Subscribe to:

- Event: `OnAfterFillDocumentEntry`

Call:

```al
PostingPreviewEventHandler.InsertDocumentEntry(TempMyPostedEntry, DocumentEntry);
```

This adds your table count to the preview list.

### 6. Recommended Posting Preview Template

```al
codeunit 50yyy "My Posting Preview"
{
    SingleInstance = true;

    var
        TempMyPostedEntry: Record "My Posted Entry" temporary;
        MaskTok: Label '***', Locked = true;

    [EventSubscriber(ObjectType::Codeunit, Codeunit::"My Posting Codeunit", OnBeforePost, '', false, false)]
    local procedure ClearGlobals()
    begin
        TempMyPostedEntry.Reset();
        TempMyPostedEntry.DeleteAll(false);
    end;

    [EventSubscriber(ObjectType::Codeunit, Codeunit::"Posting Preview Event Handler", OnGetEntries, '', false, false)]
    local procedure OnGetEntries(TableNo: Integer; var RecRef: RecordRef)
    begin
        case TableNo of
            Database::"My Posted Entry":
                RecRef.GetTable(TempMyPostedEntry);
        end;
    end;

    [EventSubscriber(ObjectType::Codeunit, Codeunit::"Posting Preview Event Handler", OnAfterShowEntries, '', false, false)]
    local procedure OnAfterShowEntries(TableNo: Integer)
    begin
        case TableNo of
            Database::"My Posted Entry":
                Page.Run(Page::"My Posted Entries Preview", TempMyPostedEntry);
        end;
    end;

    [EventSubscriber(ObjectType::Codeunit, Codeunit::"Posting Preview Event Handler", OnAfterFillDocumentEntry, '', false, false)]
    local procedure OnAfterFillDocumentEntry(var DocumentEntry: Record "Document Entry")
    var
        PostingPreviewEventHandler: Codeunit "Posting Preview Event Handler";
    begin
        PostingPreviewEventHandler.InsertDocumentEntry(TempMyPostedEntry, DocumentEntry);
    end;

    [EventSubscriber(ObjectType::Table, Database::"My Posted Entry", OnAfterInsertEvent, '', false, false)]
    local procedure OnInsertMyPostedEntry(var Rec: Record "My Posted Entry"; RunTrigger: Boolean)
    begin
        if Rec.IsTemporary() then
            exit;

        TempMyPostedEntry := Rec;
        TempMyPostedEntry."Document No." := MaskTok;
        TempMyPostedEntry.Insert();
    end;
}
```

