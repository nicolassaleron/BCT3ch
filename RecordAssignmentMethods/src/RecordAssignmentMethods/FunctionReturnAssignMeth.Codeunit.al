namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;

codeunit 50004 "FunctionReturn Assign.Meth.PTE" implements "Assignment Method PTE"
{
    procedure AssignRecord(var Source: Record "Sample Table PTE"; var Destination: Record "Sample Table PTE")
    begin
        // Using a function that returns the source record for assignment
        // This demonstrates assignment through function return value
        Destination := GetSourceRecord(Source);
    end;

    local procedure GetSourceRecord(var SourceRecord: Record "Sample Table PTE"): Record "Sample Table PTE"
    begin
        exit(SourceRecord);
    end;
}
