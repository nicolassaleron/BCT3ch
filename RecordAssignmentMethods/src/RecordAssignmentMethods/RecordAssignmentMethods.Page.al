namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;

page 50000 "Record Assignment Methods PTE"
{
    UsageCategory = Tasks;
    PageType = List;
    Caption = 'Record Assignment Methods';
    SourceTable = "Test Result PTE";
    SourceTableTemporary = true;
    ApplicationArea = All;
    Editable = false;

    layout
    {
        area(Content)
        {
            repeater(Group)
            {
                field(Method; Rec.Method)
                {
                }
                field("Is Temporary"; Rec."Is Temporary")
                {
                }
                field("Field Copied"; Rec."Field Copied")
                {
                }
                field("Filter Copied"; Rec."Filter Copied")
                {
                }
                field("Global Variable Copied"; Rec."Global Variable Copied")
                {
                }
            }
        }
    }

    actions
    {
        area(Processing)
        {
            action("Run Tests")
            {
                Caption = 'Run Tests';
                Image = Start;
                ToolTip = 'Run tests for record assignment methods.';
                trigger OnAction()
                var
                    RecCopy: Record "Test Result PTE";
                    AssignmentMethod: Enum "Assignment Method PTE";
                    AssignmentMethodOrdinal: Integer;
                begin
                    RecCopy := Rec;

                    Rec.Reset();
                    Rec.DeleteAll();

                    foreach AssignmentMethodOrdinal in AssignmentMethod.Ordinals() do begin
                        AssignmentMethod := Enum::"Assignment Method PTE".FromInteger(AssignmentMethodOrdinal);
                        InsertResultForDatabaseRecords(AssignmentMethod);
                        InsertResultForTemporaryRecords(AssignmentMethod);
                    end;

                    Rec := RecCopy;

                    CurrPage.Update();
                end;
            }
        }
    }

    local procedure InsertResultForDatabaseRecords(AssignmentMethod: Enum "Assignment Method PTE")
    var
        Source, Destination : Record "Sample Table PTE";
    begin
        PrepareRecords(Source, Destination);
        InsertResults(AssignmentMethod, Source, Destination);
    end;

    local procedure InsertResultForTemporaryRecords(AssignmentMethod: Enum "Assignment Method PTE")
    var
#pragma warning disable AA0073
        Source, Destination : Record "Sample Table PTE" temporary;
#pragma warning restore AA0073
    begin
        PrepareRecords(Source, Destination);
        InsertResults(AssignmentMethod, Source, Destination);
    end;

    local procedure PrepareRecords(var Source: Record "Sample Table PTE"; var Destination: Record "Sample Table PTE")
    begin
        Source.SetRange(Code, '7a27a6ee');
        Source.SetInnerValue('2ba6ae62-9f3a-4068-b18b-c718199614b7');
        Source.Code := 'ba7aa23c';
        Source.Description := 'acc3be9f-7386-4329-97bc-9c98a8a796d5';

        Destination.SetRange(Code, '8644eb38');
        Destination.SetInnerValue('b2290e20-841d-4be3-8a19-9bfb8fdaff67');
        Destination.Code := '026f8f15';
        Destination.Description := '96aa76ee-63cb-4b49-bf53-602ed9c69ad8';
    end;

    local procedure InsertResults(AssignmentMethod: Enum "Assignment Method PTE"; var Source: Record "Sample Table PTE"; var Destination: Record "Sample Table PTE")
    var
        AssignmentMethodImpl: Interface "Assignment Method PTE";
    begin
        AssignmentMethodImpl := AssignmentMethod;
        AssignmentMethodImpl.AssignRecord(Source, Destination);

        Rec.Init();
        Rec.Method := AssignmentMethod;
        Rec."Is Temporary" := Source.IsTemporary();

        Rec."Field Copied" :=
            (Destination.Code = Source.Code)
            and (Destination.Description = Source.Description);
        Rec."Filter Copied" := (Destination.GetFilters() = Source.GetFilters());
        Rec."Global Variable Copied" := (Destination.GetInnerValue() = Source.GetInnerValue());
        Rec.Insert();
    end;
}