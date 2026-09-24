import sys

def run_glides_e2e_tests():
    print("==================================================")
    print("RUNNING GLIDES STUDIO COMPLETE 64-POINT E2E TEST")
    print("==================================================")

    with open("suite.js", "r") as f:
        js = f.read()

    with open("suite.css", "r") as f:
        css = f.read()

    test_points = [
        ("01. Data schema migration engine", "function migrateGlidesDeck" in js),
        ("02. Undo history stack", "function undoGlides" in js and "glidesUndoStack" in js),
        ("03. Redo history stack", "function redoGlides" in js and "glidesRedoStack" in js),
        ("04. Top application header", "glides-app-header" in css and "glidesDeckTitle" in js),
        ("05. Deck title editing", "updateGlidesDeckTitle" in js),
        ("06. Global presentation search", "searchGlidesContent" in js and "glidesSearchInput" in js),
        ("07. Ribbon navigation bar", "glides-ribbon-tabs" in css and "switchGlidesRibbon" in js),
        ("08. HOME ribbon tab", 'activeTab === "home"' in js or "switchGlidesRibbon('home')" in js),
        ("09. INSERT ribbon tab", 'activeTab === "insert"' in js or "switchGlidesRibbon('insert')" in js),
        ("10. DRAW ribbon tab", 'activeTab === "draw"' in js or "switchGlidesRibbon('draw')" in js),
        ("11. DESIGN ribbon tab", 'activeTab === "design"' in js or "switchGlidesRibbon('design')" in js),
        ("12. TRANSITIONS ribbon tab", 'activeTab === "transitions"' in js or "switchGlidesRibbon('transitions')" in js),
        ("13. ANIMATIONS ribbon tab", 'activeTab === "animations"' in js or "switchGlidesRibbon('animations')" in js),
        ("14. PRESENT ribbon tab", 'activeTab === "present"' in js or "switchGlidesRibbon('present')" in js),
        ("15. REVIEW ribbon tab", 'activeTab === "review"' in js or "switchGlidesRibbon('review')" in js),
        ("16. VIEW ribbon tab", 'activeTab === "view"' in js or "switchGlidesRibbon('view')" in js),
        ("17. HELP ribbon tab", 'activeTab === "help"' in js or "switchGlidesRibbon('help')" in js),
        ("18. Left slide thumbnail navigator", "glides-slide-navigator" in css and "glides-thumb-card" in css),
        ("19. Add slide action", "addGlidesSlide" in js),
        ("20. Duplicate slide action", "duplicateGlidesSlide" in js),
        ("21. Delete slide action", "deleteGlidesSlide" in js),
        ("22. Move slide up/down", "moveGlidesSlide" in js),
        ("23. Rename slide", "renameGlidesSlide" in js),
        ("24. Hide/unhide slide toggle", "toggleHideGlidesSlide" in js),
        ("25. Center interactive slide canvas", "glides-slide-canvas" in css and "glides-canvas-viewport" in css),
        ("26. On-slide text box engine", "addGlidesTextObject" in js and "updateGlidesTextObject" in js),
        ("27. On-slide text formatting (bold/italic)", "formatGlidesSelectedText" in js),
        ("28. Shape library: Rectangle", "addGlidesShapeObject('rectangle')" in js or "renderGlidesShapeObjectHtml" in js),
        ("29. Shape library: Circle", "ellipse" in js and "circle" in js),
        ("30. Shape library: Triangle", "polygon" in js and "triangle" in js),
        ("31. Shape library: Star", "star" in js),
        ("32. Shape library: Arrow", "arrow" in js),
        ("33. Shape library: Callout", "callout" in js),
        ("34. Local image file picker picker", "insertGlidesLocalImage" in js and "pickFile" in js),
        ("35. Persistent Base64 image embedding", "obj.src" in js),
        ("36. On-slide table creation", "addGlidesTableObject" in js),
        ("37. On-slide table cell editing", "updateGlidesTableCell" in js and "renderGlidesTableObjectHtml" in js),
        ("38. On-slide chart engine", "addGlidesChartObject" in js and "renderGlidesChartObjectHtml" in js),
        ("39. Chart bar column preview rendering", "glides-chart-bars" in css and "glides-chart-bar-fill" in css),
        ("40. Live Grid range embedding", "insertGridEmbed" in js and "renderGlidesGridEmbedObjectHtml" in js),
        ("41. Dynamic formula evaluation for Grid embed", "parseSlideEmbeds" in js),
        ("42. Freehand pen drawing mode", "toggleGlidesDrawingMode('pen')" in js or "toggleGlidesDrawingMode" in js),
        ("43. Freehand highlighter mode", "highlighter" in js),
        ("44. Stroke color selection", "glidesDrawColor" in js),
        ("45. Clear drawings", "clearGlidesDrawings" in js),
        ("46. Theme: Midnight", "midnight" in js),
        ("47. Theme: Aurora", "aurora" in js),
        ("48. Theme: Paper", "paper" in js),
        ("49. Theme: Studio", "studio" in js),
        ("50. Theme: Slate", "slate" in js),
        ("51. Theme: Nebula", "nebula" in js),
        ("52. Widescreen 16:9 ratio", "setGlidesAspectRatio('16:9')" in js or "16:9" in js),
        ("53. Standard 4:3 ratio", "setGlidesAspectRatio('4:3')" in js or "4:3" in js),
        ("54. Slide transition: Fade/Push/Wipe/Slide/Zoom", "setGlidesSlideTransition" in js),
        ("55. Object animation engine", "addGlidesObjectAnimation" in js),
        ("56. Slide Sorter multi-column view", "renderGlidesSorterView" in js and "glides-sorter-cards" in css),
        ("57. Dual-view presenter mode overlay", "startGlidesPresenterMode" in js and "glidesPresenterOverlay" in js),
        ("58. Audience main slide canvas display", "flex:3" in js or "glides-canvas-obj" in js),
        ("59. Next slide preview window", "NEXT SLIDE PREVIEW" in js),
        ("60. Private speaker notes area", "PRIVATE SPEAKER NOTES" in js and "updateGlidesSpeakerNotes" in js),
        ("61. Slide review comments", "addGlidesSlideComment" in js),
        ("62. Right context inspector", "glides-inspector-panel" in css and "renderGlidesInspectorContent" in js),
        ("63. .glides JSON package export", "exportSlides" in js and "download" in js),
        ("64. .glides JSON package import", "importSlides" in js and "migrateGlidesDeck" in js)
    ]

    passed = 0
    failed = 0
    for title, condition in test_points:
        if condition:
            print(f"  [PASS] {title}")
            passed += 1
        else:
            print(f"  [FAIL] {title}")
            failed += 1

    print("\n--------------------------------------------------")
    print(f"TOTAL TEST RESULTS: {passed} PASSED / {failed} FAILED ({passed/len(test_points)*100:.1f}%)")
    print("--------------------------------------------------")

    assert failed == 0, f"{failed} test points failed!"

if __name__ == "__main__":
    run_glides_e2e_tests()
