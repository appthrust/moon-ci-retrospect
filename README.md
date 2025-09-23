# appthrust/moon-ci-retrospect

This action is designed for projects using Moonrepo, making the test results of `moon ci` and `moon run` commands more readable in GitHub Actions logs.

Typically, a trigger of those commands executes numerous tasks in parallel, which can make it difficult to view logs in task units. This results in lengthy logs, making it hard to pinpoint the cause of CI failures. This action aims to improve the readability of `moon ci` and `moon run` results, facilitating easier identification of the reasons for CI failures.

![](./screenshot0.gif)

| ![](./screenshot1.png) | ![](./screenshot2.png) |
| ---------------------- | ---------------------- |
| ![](./screenshot3.png) | ![](./screenshot4.png) |

## Usage

### On a CI workflow

```yaml
jobs:
  ci:
    name: "CI"
    runs-on: "ubuntu-latest"
    steps:
      - name: "Checkout"
        uses: "actions/checkout@v5"
        with:
          fetch-depth: 0

      - name: "Setup Toolchain"
        uses: "moonrepo/setup-toolchain@v0"

      - name: "Execute pipeline"
        run: "moon ci"

      # Add this↓

      - name: "Collect/retrospect on results"
        uses: "appthrust/moon-ci-retrospect@v2"
        if: success() || failure()
```

### On any workflow that executes a task through Moon

```yaml
jobs:
  ci:
    name: "Release"
    runs-on: "ubuntu-latest"
    steps:
      - name: "Checkout"
        uses: "actions/checkout@v5"
        with:
          fetch-depth: 0

      - name: "Setup Toolchain"
        uses: "moonrepo/setup-toolchain@v0"

      # Whatever you're doing on this workflow

      - name: "Execute release pipeline"
        run: "moon run root:publish-packages"

      # Add this↓

      - name: "Collect/retrospect on results"
        uses: "appthrust/moon-ci-retrospect@v2"
        if: success() || failure()
```

By including this action in your workflow, you can enhance the visibility of test results, making it easier to diagnose and address issues that arise during continuous integration.
