import re

with open('src/components/TransactionModal.tsx', 'r') as f:
    text = f.read()

text = text.replace('initialResourceMeta?: {', 'initialResourceMeta?: null | {')
text = text.replace('onSubmit({\\n      tipo: type,\\n      recurso: selectedResource,', 'onSubmit({\\n      nome: selectedResource,\\n      tipo: type,\\n      recurso: selectedResource,')
text = text.replace('      tipo: type,\n      recurso: selectedResource,', '      nome: selectedResource,\n      tipo: type,\n      recurso: selectedResource,')

with open('src/components/TransactionModal.tsx', 'w') as f:
    f.write(text)
