package main

import (
	"fmt"
	"strings"

	"github.com/cloudspannerecosystem/memefish/ast"
)

// Schema mirrors the TypeScript SpannerSchema type.
type Schema struct {
	Tables      []Table      `json:"tables"`
	ForeignKeys []ForeignKey `json:"foreignKeys,omitempty"`
	Indexes     []Index      `json:"indexes,omitempty"`
}

// Table mirrors SpannerTable.
type Table struct {
	Name              string             `json:"name"`
	Columns           []Column           `json:"columns"`
	PrimaryKey        []string           `json:"primaryKey"`
	InterleavedIn     string             `json:"interleavedIn,omitempty"`
	Comment           string             `json:"comment,omitempty"`
	RowDeletionPolicy *RowDeletionPolicy `json:"rowDeletionPolicy,omitempty"`
}

// Column mirrors SpannerColumn.
type Column struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	IsArray    bool   `json:"isArray,omitempty"`
	IsNullable *bool  `json:"isNullable,omitempty"`
	Comment    string `json:"comment,omitempty"`
}

type RowDeletionPolicy struct {
	ColumnName string `json:"columnName"`
	NumDays    string `json:"numDays"`
}

type Index struct {
	Name           string     `json:"name"`
	Table          string     `json:"table"`
	Columns        []IndexKey `json:"columns"`
	Storing        []string   `json:"storing,omitempty"`
	InterleavedIn  string     `json:"interleavedIn,omitempty"`
	IsUnique       bool       `json:"isUnique,omitempty"`
	IsNullFiltered bool       `json:"isNullFiltered,omitempty"`
}

type IndexKey struct {
	Name      string `json:"name"`
	Direction string `json:"direction,omitempty"`
}

// ForeignKey mirrors the TypeScript interface.
type ForeignKey struct {
	Name               string   `json:"name"`
	ReferencingTable   string   `json:"referencingTable"`
	ReferencingColumns []string `json:"referencingColumns"`
	ReferencedTable    string   `json:"referencedTable"`
	ReferencedColumns  []string `json:"referencedColumns"`
}

func buildSchema(ddls []ast.DDL) (*Schema, error) {
	builder := newSchemaBuilder()
	for _, ddl := range ddls {
		if err := builder.consume(ddl); err != nil {
			return nil, err
		}
	}

	return builder.Schema(), nil
}

type schemaBuilder struct {
	tables    []*Table
	index     map[string]*Table
	foreign   []*ForeignKey
	indexes   []Index
	fkCounter int
}

func newSchemaBuilder() *schemaBuilder {
	return &schemaBuilder{index: make(map[string]*Table)}
}

func (b *schemaBuilder) Schema() *Schema {
	schema := &Schema{Tables: make([]Table, len(b.tables))}
	for i, tbl := range b.tables {
		columns := make([]Column, len(tbl.Columns))
		copy(columns, tbl.Columns)
		pk := make([]string, len(tbl.PrimaryKey))
		copy(pk, tbl.PrimaryKey)

		table := Table{
			Name:          tbl.Name,
			Columns:       columns,
			PrimaryKey:    pk,
			InterleavedIn: tbl.InterleavedIn,
			Comment:       tbl.Comment,
		}

		if tbl.RowDeletionPolicy != nil {
			policy := *tbl.RowDeletionPolicy
			table.RowDeletionPolicy = &policy
		}

		schema.Tables[i] = table
	}

	if len(b.foreign) > 0 {
		schema.ForeignKeys = make([]ForeignKey, len(b.foreign))
		for i, fk := range b.foreign {
			schema.ForeignKeys[i] = *fk
		}
	}

	if len(b.indexes) > 0 {
		schema.Indexes = make([]Index, len(b.indexes))
		for i, idx := range b.indexes {
			columns := make([]IndexKey, len(idx.Columns))
			copy(columns, idx.Columns)
			storing := make([]string, len(idx.Storing))
			copy(storing, idx.Storing)

			schema.Indexes[i] = Index{
				Name:           idx.Name,
				Table:          idx.Table,
				Columns:        columns,
				Storing:        storing,
				InterleavedIn:  idx.InterleavedIn,
				IsUnique:       idx.IsUnique,
				IsNullFiltered: idx.IsNullFiltered,
			}
		}
	}

	return schema
}

func (b *schemaBuilder) consume(node ast.DDL) error {
	switch stmt := node.(type) {
	case *ast.CreateTable:
		return b.handleCreateTable(stmt)
	case *ast.AlterTable:
		return b.handleAlterTable(stmt)
	case *ast.CreateIndex:
		return b.handleCreateIndex(stmt)
	default:
		// Ignore statements that do not impact the relational model.
		return nil
	}
}

func (b *schemaBuilder) handleCreateTable(stmt *ast.CreateTable) error {
	name := pathToString(stmt.Name)
	if name == "" {
		return fmt.Errorf("CREATE TABLE is missing a name")
	}
	if _, exists := b.index[name]; exists {
		return fmt.Errorf("table %q already exists", name)
	}

	table := &Table{Name: name}

	for _, col := range stmt.Columns {
		column, err := convertColumn(col)
		if err != nil {
			return fmt.Errorf("table %s column %s: %w", name, identName(col.Name), err)
		}
		table.Columns = append(table.Columns, column)
	}

	table.PrimaryKey = collectPrimaryKeys(stmt)

	if stmt.RowDeletionPolicy != nil {
		table.RowDeletionPolicy = convertRowDeletionPolicyNode(stmt.RowDeletionPolicy.RowDeletionPolicy)
	}

	if stmt.Cluster != nil && stmt.Cluster.TableName != nil {
		table.InterleavedIn = pathToString(stmt.Cluster.TableName)
	}

	for _, constraint := range stmt.TableConstraints {
		if fk := tableConstraintToForeignKey(name, constraint); fk != nil {
			b.addForeignKey(fk)
		}
	}

	b.tables = append(b.tables, table)
	b.index[name] = table
	return nil
}

func (b *schemaBuilder) handleAlterTable(stmt *ast.AlterTable) error {
	name := pathToString(stmt.Name)
	table := b.index[name]
	if table == nil {
		return fmt.Errorf("ALTER TABLE references unknown table %q", name)
	}

	switch alt := stmt.TableAlteration.(type) {
	case *ast.AddColumn:
		column, err := convertColumn(alt.Column)
		if err != nil {
			return fmt.Errorf("ALTER TABLE %s ADD COLUMN %s: %w", name, identName(alt.Column.Name), err)
		}
		table.Columns = append(table.Columns, column)
	case *ast.AddTableConstraint:
		if fk := tableConstraintToForeignKey(name, alt.TableConstraint); fk != nil {
			b.addForeignKey(fk)
		}
	case *ast.DropColumn:
		dropName := identName(alt.Name)
		table.Columns = filterColumns(table.Columns, dropName)
		table.PrimaryKey = removeString(table.PrimaryKey, dropName)
	case *ast.DropConstraint:
		b.dropForeignKey(identName(alt.Name))
	case *ast.SetInterleaveIn:
		table.InterleavedIn = pathToString(alt.TableName)
	case *ast.AddRowDeletionPolicy:
		table.RowDeletionPolicy = convertRowDeletionPolicyNode(alt.RowDeletionPolicy)
	case *ast.ReplaceRowDeletionPolicy:
		table.RowDeletionPolicy = convertRowDeletionPolicyNode(alt.RowDeletionPolicy)
	case *ast.DropRowDeletionPolicy:
		table.RowDeletionPolicy = nil
	default:
		// Unsupported alteration type; ignore.
	}

	return nil
}

func (b *schemaBuilder) handleCreateIndex(stmt *ast.CreateIndex) error {
	name := pathToString(stmt.Name)
	if name == "" {
		return fmt.Errorf("CREATE INDEX is missing a name")
	}

	tableName := pathToString(stmt.TableName)
	if tableName == "" {
		return fmt.Errorf("CREATE INDEX %s is missing a table name", name)
	}

	index := Index{
		Name:           name,
		Table:          tableName,
		Columns:        convertIndexKeys(stmt.Keys),
		IsUnique:       stmt.Unique,
		IsNullFiltered: stmt.NullFiltered,
	}

	if stmt.Storing != nil {
		index.Storing = identList(stmt.Storing.Columns)
	}

	if stmt.InterleaveIn != nil && stmt.InterleaveIn.TableName != nil {
		index.InterleavedIn = identName(stmt.InterleaveIn.TableName)
	}

	b.indexes = append(b.indexes, index)
	return nil
}

func (b *schemaBuilder) addForeignKey(fk *ForeignKey) {
	if fk.Name == "" {
		fk.Name = b.generateForeignKeyName(fk)
	}
	b.foreign = append(b.foreign, fk)
}

func (b *schemaBuilder) generateForeignKeyName(fk *ForeignKey) string {
	suffix := strings.Join(fk.ReferencingColumns, "_")
	if suffix == "" {
		suffix = fmt.Sprintf("ref_%d", b.fkCounter)
	}
	b.fkCounter++
	return fmt.Sprintf("%s_%s_fk", fk.ReferencingTable, suffix)
}

func (b *schemaBuilder) dropForeignKey(name string) {
	if name == "" {
		return
	}
	filtered := b.foreign[:0]
	for _, fk := range b.foreign {
		if fk.Name != name {
			filtered = append(filtered, fk)
		}
	}
	b.foreign = filtered
}

func convertColumn(def *ast.ColumnDef) (Column, error) {
	typeName, isArray, err := formatSchemaType(def.Type)
	if err != nil {
		return Column{}, err
	}

	col := Column{
		Name: identName(def.Name),
		Type: typeName,
	}

	if isArray {
		col.IsArray = true
	}

	if def.PrimaryKey || def.NotNull {
		val := false
		col.IsNullable = &val
	}

	return col, nil
}

func collectPrimaryKeys(stmt *ast.CreateTable) []string {
	pkSet := make(map[string]struct{})
	var keys []string

	for _, key := range stmt.PrimaryKeys {
		name := identName(key.Name)
		if name == "" {
			continue
		}
		if _, exists := pkSet[name]; !exists {
			pkSet[name] = struct{}{}
			keys = append(keys, name)
		}
	}

	for _, col := range stmt.Columns {
		if col.PrimaryKey {
			name := identName(col.Name)
			if name == "" {
				continue
			}
			if _, exists := pkSet[name]; !exists {
				pkSet[name] = struct{}{}
				keys = append(keys, name)
			}
		}
	}

	return keys
}

func tableConstraintToForeignKey(owner string, constraint *ast.TableConstraint) *ForeignKey {
	fkNode, ok := constraint.Constraint.(*ast.ForeignKey)
	if !ok {
		return nil
	}

	fk := &ForeignKey{
		Name:               identName(constraint.Name),
		ReferencingTable:   owner,
		ReferencingColumns: identList(fkNode.Columns),
		ReferencedTable:    pathToString(fkNode.ReferenceTable),
		ReferencedColumns:  identList(fkNode.ReferenceColumns),
	}

	return fk
}

func formatSchemaType(t ast.SchemaType) (string, bool, error) {
	switch typ := t.(type) {
	case *ast.ScalarSchemaType:
		return string(typ.Name), false, nil
	case *ast.SizedSchemaType:
		size := "MAX"
		if !typ.Max {
			size = formatIntValue(typ.Size)
		}
		return fmt.Sprintf("%s(%s)", typ.Name, size), false, nil
	case *ast.ArraySchemaType:
		inner, _, err := formatSchemaType(typ.Item)
		if err != nil {
			return "", false, err
		}
		return inner, true, nil
	case *ast.NamedType:
		return joinIdents(typ.Path), false, nil
	default:
		// Fall back to SQL string rendering for schema types we don't explicitly map.
		return t.SQL(), false, nil
	}
}

func formatIntValue(value ast.IntValue) string {
	switch v := value.(type) {
	case *ast.IntLiteral:
		return v.Value
	case *ast.Param:
		return "@" + v.Name
	case *ast.CastIntValue:
		return formatIntValue(v.Expr)
	default:
		return ""
	}
}

func identName(ident *ast.Ident) string {
	if ident == nil {
		return ""
	}
	return ident.Name
}

func pathToString(path *ast.Path) string {
	if path == nil {
		return ""
	}
	return joinIdents(path.Idents)
}

func joinIdents(idents []*ast.Ident) string {
	if len(idents) == 0 {
		return ""
	}
	parts := make([]string, len(idents))
	for i, ident := range idents {
		parts[i] = identName(ident)
	}
	return strings.Join(parts, ".")
}

func identList(idents []*ast.Ident) []string {
	names := make([]string, 0, len(idents))
	for _, ident := range idents {
		if name := identName(ident); name != "" {
			names = append(names, name)
		}
	}
	return names
}

func convertIndexKeys(keys []*ast.IndexKey) []IndexKey {
	result := make([]IndexKey, 0, len(keys))
	for _, key := range keys {
		if key == nil {
			continue
		}
		idxKey := IndexKey{Name: identName(key.Name)}
		if dir := string(key.Dir); dir != "" {
			idxKey.Direction = dir
		}
		result = append(result, idxKey)
	}
	return result
}

func convertRowDeletionPolicyNode(node *ast.RowDeletionPolicy) *RowDeletionPolicy {
	if node == nil {
		return nil
	}

	name := identName(node.ColumnName)
	if name == "" {
		return nil
	}

	policy := &RowDeletionPolicy{ColumnName: name}
	if node.NumDays != nil {
		policy.NumDays = node.NumDays.Value
	}
	return policy
}

func filterColumns(columns []Column, name string) []Column {
	if name == "" {
		return columns
	}
	filtered := columns[:0]
	for _, column := range columns {
		if column.Name != name {
			filtered = append(filtered, column)
		}
	}
	return filtered
}

func removeString(values []string, target string) []string {
	if target == "" {
		return values
	}
	filtered := values[:0]
	for _, value := range values {
		if value != target {
			filtered = append(filtered, value)
		}
	}
	return filtered
}
