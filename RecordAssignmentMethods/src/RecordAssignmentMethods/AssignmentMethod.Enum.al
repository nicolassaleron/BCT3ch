namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;

enum 50000 "Assignment Method PTE" implements "Assignment Method PTE"
{
    Extensible = true;

    value(0; "Operator")
    {
        Caption = 'DestinationRecord := SourceRecord';
        Implementation = "Assignment Method PTE" = "Operator Assign.Meth.PTE";
    }
    value(1; "Copy")
    {
        Caption = 'DestinationRecord.Copy(SourceRecord)';
        Implementation = "Assignment Method PTE" = "Copy Assign.Meth.PTE";
    }
    value(2; "TransferFields")
    {
        Caption = 'DestinationRecord.TransferFields(SourceRecord)';
        Implementation = "Assignment Method PTE" = "TransferFields Assign.Meth.PTE";
    }
    value(3; "Function Return")
    {
        Caption = 'DestinationRecord := GetSourceRecord()';
        Implementation = "Assignment Method PTE" = "FunctionReturn Assign.Meth.PTE";
    }
    value(4; "Function Copy Return")
    {
        Caption = 'DestinationRecord.Copy(GetSourceRecord())';
        Implementation = "Assignment Method PTE" = "FctReturnCopy Assign.Meth.PTE";
    }
}