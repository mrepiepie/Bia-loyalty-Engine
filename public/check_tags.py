import re

def check_html_tags(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all div opening and closing tags
    # We ignore self-closing tags and matches inside comments
    # Remove HTML comments first
    clean_content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
    
    div_opens = clean_content.count('<div')
    div_closes = clean_content.count('</div>')
    
    section_opens = clean_content.count('<section')
    section_closes = clean_content.count('</section>')
    
    print(f"Total <div: {div_opens}, Total </div>: {div_closes}")
    print(f"Total <section: {section_opens}, Total </section>: {section_closes}")

check_html_tags(r"C:\Users\Sanji\AppData\Local\Temp\antigravity_placeholder_if_any" or r"C:\Users\Sanji\.gemini\antigravity\scratch\bia-loyalty-engine\public\index.html")
