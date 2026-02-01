# Mortgage Simulator Build Script

SRC_DIR := src
DIST_DIR := dist
OUTPUT := $(DIST_DIR)/mortgage-study.html

CSS_FILES := $(SRC_DIR)/css/variables.css \
             $(SRC_DIR)/css/layout.css \
             $(SRC_DIR)/css/components.css \
             $(SRC_DIR)/css/charts.css

JS_FILES := $(SRC_DIR)/js/state.js \
            $(SRC_DIR)/js/formulas.js \
            $(SRC_DIR)/js/ui.js \
            $(SRC_DIR)/js/charts.js \
            $(SRC_DIR)/js/events.js \
            $(SRC_DIR)/js/main.js

.PHONY: all clean watch

all: $(OUTPUT)

$(OUTPUT): $(SRC_DIR)/index.html $(CSS_FILES) $(JS_FILES)
	@mkdir -p $(DIST_DIR)
	@echo "Building $(OUTPUT)..."
	@cat $(SRC_DIR)/index.html | sed '/<\/head>/,$$d' > $(OUTPUT)
	@echo "<style>" >> $(OUTPUT)
	@cat $(CSS_FILES) >> $(OUTPUT)
	@echo "</style>" >> $(OUTPUT)
	@echo "</head>" >> $(OUTPUT)
	@cat $(SRC_DIR)/index.html | sed -n '/<body>/,/<\/body>/p' >> $(OUTPUT)
	@echo "<script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>" >> $(OUTPUT)
	@echo "<script>" >> $(OUTPUT)
	@cat $(JS_FILES) >> $(OUTPUT)
	@echo "</script>" >> $(OUTPUT)
	@echo "</html>" >> $(OUTPUT)
	@echo "✅ Build complete: $(OUTPUT)"

clean:
	rm -rf $(DIST_DIR)

# Optional: watch for changes (requires fswatch or inotifywait)
watch:
	@echo "Watching for changes in $(SRC_DIR)..."
	@fswatch -o $(SRC_DIR) | xargs -n1 -I{} make all
