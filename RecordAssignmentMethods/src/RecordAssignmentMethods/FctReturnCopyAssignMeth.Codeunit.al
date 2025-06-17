namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;

codeunit 50006 "FctReturnCopy Assign.Meth.PTE" implements "Assignment Method PTE"
{
    procedure AssignRecord(var Source: Record "Sample Table PTE"; var Destination: Record "Sample Table PTE")
    begin
        // Using a function that returns the source record for assignment
        // This demonstrates assignment through function return value
        // Here we use the Copy method to copy the record from the function return
        if Source.IsTemporary() then
            Destination.Copy(GetSourceRecordTemp(Source), true)
        else
            Destination.Copy(GetSourceRecord(Source));
    end;

    local procedure GetSourceRecordTemp(var SourceRecord: Record "Sample Table PTE"): Record "Sample Table PTE" temporary
    begin
        exit(SourceRecord);
    end;

    local procedure GetSourceRecord(var SourceRecord: Record "Sample Table PTE"): Record "Sample Table PTE"
    begin
        exit(SourceRecord);
    end;
}
