namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;


table 50001 "Test Result PTE"
{
    DataClassification = CustomerContent;
    Caption = 'Test Result';

    fields
    {
        field(1; Method; Enum "Assignment Method PTE")
        {
            Caption = 'Method';
            ToolTip = 'Specifies the method used for the record assignment.';
        }
        field(7; "Is Temporary"; Boolean)
        {
            Caption = 'Is Temporary';
            ToolTip = 'Specifies if the source/destination records are temporary.';
        }
        field(3; "Field Copied"; Boolean)
        {
            Caption = 'Field Copied';
            ToolTip = 'Specifies if the fields from the source record were copied to the new record.';
        }
        field(4; "Filter Copied"; Boolean)
        {
            Caption = 'Filter Copied';
            ToolTip = 'Specifies if the filter from the source record was copied to the new record.';
        }
        field(6; "Global Variable Copied"; Boolean)
        {
            Caption = 'Global Variable Copied';
            ToolTip = 'Specifies if the global variable from the source record was copied to the new record.';
        }
    }

    keys
    {
        key(PK; "Method", "Is Temporary")
        {
            Clustered = true;
        }
    }
}