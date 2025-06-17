namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;

codeunit 50005 "TransferFields Assign.Meth.PTE" implements "Assignment Method PTE"
{
    procedure AssignRecord(var Source: Record "Sample Table PTE"; var Destination: Record "Sample Table PTE")
    begin
        // Using TransferFields to copy field values from source to destination
        // This copies only the field values, not filters or other properties
        Destination.TransferFields(Source);
    end;
}
