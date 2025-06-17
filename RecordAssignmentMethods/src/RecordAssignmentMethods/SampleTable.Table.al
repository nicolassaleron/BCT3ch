namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;

table 50000 "Sample Table PTE"
{
    DataClassification = CustomerContent;
    Caption = 'Sample Table';

    fields
    {
        field(1; "Code"; Code[20])
        {
            Caption = 'Code';
        }
        field(2; Description; Text[100])
        {
            Caption = 'Description';
        }
    }

    keys
    {
        key(PK; Code)
        {
            Clustered = true;
        }
    }

    var
        InnerValue: Text;


    procedure SetInnerValue(NewValue: Text)
    begin
        InnerValue := NewValue;
    end;

    procedure GetInnerValue(): Text
    begin
        exit(InnerValue);
    end;
}