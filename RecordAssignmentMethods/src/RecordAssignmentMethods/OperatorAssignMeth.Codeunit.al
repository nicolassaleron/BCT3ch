namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;

codeunit 50002 "Operator Assign.Meth.PTE" implements "Assignment Method PTE"
{
    procedure AssignRecord(var Source: Record "Sample Table PTE"; var Destination: Record "Sample Table PTE")
    begin
        // Direct assignment using the := operator
        // This performs a shallow copy of the record
        Destination := Source;
    end;
}
