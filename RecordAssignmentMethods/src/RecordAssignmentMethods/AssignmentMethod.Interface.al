namespace NicolasSaleron.BCT3ch.RecordAssignmentMethods;

interface "Assignment Method PTE"
{
    /// <summary>
    /// Assigns the source record to the destination record using the specified assignment method.
    /// </summary>
    /// <param name="DestinationRecord">The record to which the source record will be assigned.</param>
    /// <param name="SourceRecord">The record from which data will be copied or transferred.</param>
    /// <param name="Method">The method used for the assignment.</param>
    procedure AssignRecord(var Source: Record "Sample Table PTE"; var Destination: Record "Sample Table PTE");
}