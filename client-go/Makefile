test:
	go test -v ./...

test-cover:
	go test ./... -coverprofile=./cover.out -covermode=atomic -coverpkg=./...
	go tool cover -html cover.out -o cover.html

.PHONY: test test-cover