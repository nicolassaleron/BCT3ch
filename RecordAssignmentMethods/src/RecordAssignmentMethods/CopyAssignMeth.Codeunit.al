namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;

codeunit 50001 "Copy Assign.Meth.PTE" implements "Assignment Method PTE"
{
    procedure AssignRecord(var Source: Record "Sample Table PTE"; var Destination: Record "Sample Table PTE")
    begin
        // Using the Copy method to copy all fields and properties
        // This performs a deep copy including system fields like filters, etc.
        Destination.Copy(Source);
    end;
}
