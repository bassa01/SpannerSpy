package main

import (
    "encoding/json"
    "errors"
    "flag"
    "fmt"
    "io"
    "os"

    "github.com/cloudspannerecosystem/memefish"
)

func main() {
    var inputPath string
    var pretty bool

    flag.StringVar(&inputPath, "input", "", "Path to a file that contains Cloud Spanner DDL (reads stdin when omitted).")
    flag.BoolVar(&pretty, "pretty", false, "Pretty-print JSON output.")
    flag.Parse()

    source := inputPath
    if source == "" {
        source = "<stdin>"
    }

    data, err := readAll(inputPath)
    if err != nil {
        fail(err)
    }

    ddls, err := memefish.ParseDDLs(source, string(data))
    if err != nil {
        fail(err)
    }

    schema, err := buildSchema(ddls)
    if err != nil {
        fail(err)
    }

    if err := writeJSON(schema, pretty, os.Stdout); err != nil {
        fail(err)
    }
}

func readAll(path string) ([]byte, error) {
    if path == "" || path == "-" {
        return io.ReadAll(os.Stdin)
    }

    return os.ReadFile(path)
}

func writeJSON(v any, pretty bool, w io.Writer) error {
    enc := json.NewEncoder(w)
    if pretty {
        enc.SetIndent("", "  ")
    }

    return enc.Encode(v)
}

func fail(err error) {
    if err == nil {
        return
    }
    var pathErr *os.PathError
    if errors.As(err, &pathErr) {
        fmt.Fprintf(os.Stderr, "error: %v\n", pathErr)
    } else {
        fmt.Fprintf(os.Stderr, "error: %s\n", err)
    }
    os.Exit(1)
}
