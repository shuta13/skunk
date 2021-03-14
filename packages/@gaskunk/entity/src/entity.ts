import { Table } from './table';

export class Entity {
  private sheets: GoogleAppsScript.Spreadsheet.Spreadsheet | null = null;
  private table = new Table(this.sheets);

  constructor(sheets?: GoogleAppsScript.Spreadsheet.Spreadsheet) {
    this.sheets = sheets || SpreadsheetApp.getActive();
  }

  save() {
    /**
     * Insert new sheet as table
     */
    const tableName = this.constructor.name;
    this.table.create(tableName);

    const entityProperties = Object.entries(this);
    const values = entityProperties.filter(
      (property) => !property.includes('sheets') && !property.includes('table')
    );

    /**
     * Insert column name
     */
    const colunmNames = values.map((value) => value[0]);
    const target = this.sheets?.getSheetByName(tableName);
    target?.appendRow(colunmNames);

    /**
     * Insert initial values
     */
    const initialValues = values.map((value) => value[1]);
    target?.appendRow(initialValues);

    return {
      columnNames: colunmNames,
      initialValues: initialValues,
    };
  }
  find() {
    // TODO: Get all data
  }
  findBy() {
    // TODO: Get data by params
  }
  delete() {
    // TODO: Delete data
    const tableName = this.constructor.name;
    const target = this.sheets?.getSheetByName(tableName);
    const result = target?.clearContents();
    if (result) return `Deleted ${tableName} data`;
    return new Error(`Cannot deleted ${tableName} data`);
  }
  deleteBy() {
    // TODO: Delete data by params
  }
  order() {
    // TODO: Sort data
  }
  update() {
    // TODO: Update data
  }
}
