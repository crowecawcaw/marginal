[x] move the file operstions (e.g. new file) to a File menu instead of under the Marginal menu.
[x] keep the sidebar closed by default
[x] when making new files, if there's already an "Untitled.md", the next file should be "Untitled2.md"
[x] remove search tab. instead, support find in current doc only that highlights the current term ad shows how many times the term was found with next/previous buttons. more similar to a browser than vscode.
[x] update hte TOC icon to have bars of unequal widths instead of equal. like the 3 bars top to botton are : wide, nested and shorted, wide
[x] make page title match the name of the current doc
[x] if teh file is not yet saved/titled, make its name match teh first header in the doc
[x] if the doc is blank, show "Untitled" as a h1 header as placeholder text. it's faded. when the user enters a characetr, it disappears
[x] if tehre's only one document open, do not show tabs
[x] remove teh side toolbar
  [x] remove the file icon on teh sidebar. if the user opens a folder, show the files as a sidebar but otherwise dont show it
  [x] add a command to toggle open the outline. its a separate sidebar from the file viewer. someone can have a folder open and the outline view opened and see both sidebars at the same time. order left to right is: files, outline, content
[x] rename table of contents to outline
[x] add autopairing to markdownn code. like if i type `[`, add the closing `]` automatically if the next character is not already a `]`. same for `(`.
[x] in presentation mode, entering triple backticks shoudl create a codeblock.
[ ] in markdown code view, add syntax highlighting to the markdown. italics and bold should be italics and bold. headers sohuld be bold
[x] add autoformatting to markdown. use prettier. it's under File > Format. and only enabled available in codeview. its mostly for formatting tables
[x] in page title with doc file name, add "Unsaved" if it has changes.
[x] add options for "View rendered document" and "View markdown code". add keyboard shortcuts
[x] under the app menu, add a View README option. it opens a README.md file which is not editable but which is a help guide. it lists keyboard shortcuts and other useful info. keep it concise.
[x] make the presenttaion / code toggle float on the bottom right. make it just grey and subtle insetad of blue. so it disappears a bit
[x] lines for teh outline buttonn should not be centetered. keep the left start points where they re but vary the lenghts. should look like nested levels of text of varying lengths