namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;

using NicolasSaleron.BCT3ch.RecordAssignmentMethods;

permissionset 50000 "Full Access PTE"
{
    Assignable = true;
    Permissions = tabledata "Sample Table PTE" = RIMD,
        table "Sample Table PTE" = X,
        tabledata "Test Result PTE" = RIMD,
        table "Test Result PTE" = X,
        codeunit "Copy Assign.Meth.PTE" = X,
        codeunit "FunctionReturn Assign.Meth.PTE" = X,
        codeunit "Operator Assign.Meth.PTE" = X,
        codeunit "TransferFields Assign.Meth.PTE" = X;
}