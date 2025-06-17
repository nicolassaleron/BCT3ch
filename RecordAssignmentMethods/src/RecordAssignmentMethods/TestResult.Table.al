namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;


table 50001 "Test Result PTE"
{
    DataClassification = CustomerContent;
    Caption = 'Test Result';

    fields
    {
        field(1; "Method"; Enum "Assignment Method PTE")
        {
            Caption = 'Method';
            ToolTip = 'Specifies the method used for the record assignment.';
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
        field(7; "Set Load Fields Copied"; Boolean)
        {
            Caption = 'Set Load Fields Copied';
            ToolTip = 'Specifies if the SetLoadFields specified on the source record was copied to the new record.';
        }
    }

    keys
    {
        key(PK; "Method")
        {
            Clustered = true;
        }
    }
}