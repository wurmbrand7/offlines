import json

def migrate_glides_data(raw_data):
    if not isinstance(raw_data, dict):
        raw_data = {}

    title = raw_data.get('title', 'Untitled Presentation')
    aspect_ratio = raw_data.get('aspectRatio', '16:9')
    theme = raw_data.get('theme', 'midnight')
    slides_raw = raw_data.get('slides', [])

    if not slides_raw:
        slides_raw = [{'text': 'Welcome to your deck'}]

    migrated_slides = []
    for idx, s in enumerate(slides_raw):
        if isinstance(s, str):
            s = {'text': s}
        elif not isinstance(s, dict):
            s = {'text': str(s)}

        slide_id = s.get('id') or f"slide_{idx+1}_{hash(str(s)) & 0xffffffff}"
        slide_name = s.get('name') or f"Slide {idx+1}"
        layout = s.get('layout') or "title-content"
        background = s.get('background') or {"type": "color", "value": "#0f172a"}
        notes = s.get('notes', '')
        comments = s.get('comments', [])
        transition = s.get('transition') or {"type": "fade", "duration": 0.5}
        animations = s.get('animations', [])
        hidden = bool(s.get('hidden', False))

        objects = s.get('objects', [])
        if not objects:
            objects = []
            text_content = s.get('text', '')
            if text_content:
                # Check for grid embed
                if "{{GRID:" in text_content:
                    import re
                    match = re.search(r'\{\{GRID:([A-Z0-9:]+)\}\}', text_content)
                    range_str = match.group(1) if match else "A1:B4"
                    objects.append({
                        "id": f"obj_grid_{idx+1}",
                        "type": "gridEmbed",
                        "x": 15, "y": 20, "width": 70, "height": 50,
                        "range": range_str, "workbook": "default", "sheet": "Sheet1"
                    })
                    cleaned_text = re.sub(r'\{\{GRID:[A-Z0-9:]+\}\}', '', text_content).strip()
                    if cleaned_text:
                        objects.append({
                            "id": f"obj_text_{idx+1}",
                            "type": "text",
                            "x": 10, "y": 5, "width": 80, "height": 15,
                            "content": cleaned_text, "fontSize": "24px", "color": "#f8fafc"
                        })
                else:
                    objects.append({
                        "id": f"obj_text_{idx+1}",
                        "type": "text",
                        "x": 10, "y": 20, "width": 80, "height": 60,
                        "content": text_content, "fontSize": "24px", "color": "#f8fafc"
                    })

        migrated_slides.append({
            "id": slide_id,
            "name": slide_name,
            "layout": layout,
            "background": background,
            "objects": objects,
            "notes": notes,
            "comments": comments,
            "transition": transition,
            "animations": animations,
            "hidden": hidden
        })

    return {
        "type": "glides",
        "title": title,
        "aspectRatio": aspect_ratio,
        "theme": theme,
        "slides": migrated_slides
    }

# Test migration
legacy = {"slides": [{"text": "Welcome"}, {"text": "Data {{GRID:A1:C5}}"}]}
res = migrate_glides_data(legacy)
assert len(res["slides"]) == 2
assert res["slides"][0]["objects"][0]["content"] == "Welcome"
assert res["slides"][1]["objects"][0]["type"] == "gridEmbed"
print("Migration test passed successfully!")
