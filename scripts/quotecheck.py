#!/usr/bin/env python3
"""Check that each finding's quote appears verbatim on the page it cites.

Code, not a model: fetch the raw HTML, strip tags, normalise punctuation and
whitespace, then match each excerpt. A model checking quotes through a fetch
tool sees a summary of the page, not its text, so it cannot do this reliably.

Usage: python3 scripts/quotecheck.py research/findings.json research/quotecheck.json
"""
import html
import json
import re
import sys
import time
import urllib.request

UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126 Safari/537.36')
cache = {}


def norm(s):
    for a, b in ((' ', ' '), ('’', "'"), ('‘', "'"), ('“', '"'),
                 ('”', '"'), ('–', '-'), ('—', '-'), ('‑', '-')):
        s = s.replace(a, b)
    s = re.sub(r'[^\w\s]', ' ', s.lower())
    return re.sub(r'\s+', ' ', s).strip()


def get(url):
    if url in cache:
        return cache[url]
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/pdf'})
        resp = urllib.request.urlopen(req, timeout=40)
        body = resp.read()
        if url.lower().endswith('.pdf') or 'pdf' in (resp.headers.get('Content-Type') or '').lower() or body[:5] == b'%PDF-':
            cache[url] = pdf_text(body)
            return cache[url]
        raw = body.decode('utf-8', 'ignore')
        text = re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>', ' ', raw)
        cache[url] = norm(html.unescape(re.sub(r'</?[A-Za-z][^>]*>', ' ', text)))
    except Exception as e:  # blocked, timed out, not HTML: the finding stays unverified
        cache[url] = None
        print('FETCH FAIL', url, str(e)[:80], file=sys.stderr)
    time.sleep(0.4)
    return cache[url]


def pdf_text(body):
    """PDFs (papers, technical reports): extract text with pdftotext, then normalise."""
    import subprocess, tempfile
    with tempfile.NamedTemporaryFile(suffix='.pdf') as f:
        f.write(body); f.flush()
        out = subprocess.run(['pdftotext', '-q', f.name, '-'], capture_output=True).stdout.decode('utf-8', 'ignore')
    return norm(out)


def github_raw(url):
    """github.com pages render client-side fragments; try the raw file or the README."""
    m = re.match(r'https?://github\.com/([^/]+)/([^/#?]+)(?:/blob/([^/]+)/(.+))?', url)
    if not m:
        return None
    owner, repo, ref, path = m.groups()
    cands = [f'https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}'] if path else \
            [f'https://raw.githubusercontent.com/{owner}/{repo}/HEAD/README.md',
             f'https://raw.githubusercontent.com/{owner}/{repo}/HEAD/readme.md']
    for c in cands:
        t = get(c)
        if t:
            return t
    return None


def epmc_abstract(pmid):
    """The same article's published abstract via Europe PMC, for PubMed pages that
    serve a bot check or a truncated abstract to scripts."""
    key = f'epmc:{pmid}'
    if key not in cache:
        api = ('https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:'
               f'{pmid}%20AND%20SRC:MED&resultType=core&format=json')
        try:
            req = urllib.request.Request(api, headers={'User-Agent': UA, 'Accept': 'application/json'})
            res = json.loads(urllib.request.urlopen(req, timeout=25).read())['resultList']['result']
            text = ' '.join(r.get('title', '') + ' ' + r.get('abstractText', '') for r in res)
            cache[key] = norm(html.unescape(re.sub(r'</?[A-Za-z][^>]*>', ' ', text)))
        except Exception as e:
            cache[key] = None
            print('FETCH FAIL', api, str(e)[:80], file=sys.stderr)
    return cache[key]


def match(page, quote):
    parts = [norm(p) for p in re.split(r'\.\.\.|…', html.unescape(quote))]
    parts = [p for p in parts if len(p) >= 12]
    if not parts:
        return 'too_short', None
    hit = sum(1 for p in parts if p in page)
    return ('verified' if hit == len(parts) else ('partial' if hit else 'not_found')), f'{hit}/{len(parts)}'


def epmc_fulltext(pmcid):
    """Open-access full text via Europe PMC, for PMC pages that rate-limit scripts."""
    key = f'epmcft:{pmcid}'
    if key not in cache:
        api = f'https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML'
        try:
            req = urllib.request.Request(api, headers={'User-Agent': UA})
            raw = urllib.request.urlopen(req, timeout=25).read().decode('utf-8', 'ignore')
            cache[key] = norm(html.unescape(re.sub(r'</?[A-Za-z][^>]*>', ' ', raw)))
        except Exception as e:
            cache[key] = None
            print('FETCH FAIL', api, str(e)[:80], file=sys.stderr)
    return cache[key]


def check(url, quote):
    page = get(url)
    status, score = match(page, quote) if page is not None else ('fetch_fail', None)
    if status == 'verified':
        return status, score
    pmid = re.search(r'pubmed\.ncbi\.nlm\.nih\.gov/(\d+)', url)
    pmcid = re.search(r'(PMC\d+)', url)
    fallbacks = []
    if 'github.com/' in url:
        fallbacks.append((lambda u: github_raw(u), url, 'GitHub raw'))
    if pmid:
        fallbacks.append((epmc_abstract, pmid.group(1), 'Europe PMC abstract'))
    if pmcid:
        fallbacks.append((epmc_fulltext, pmcid.group(1), 'Europe PMC full text'))
    for fetch, ident, label in fallbacks:
        text = fetch(ident)
        if text is not None:
            alt, alt_score = match(text, quote)
            if alt == 'verified':
                return 'verified', f'{alt_score} ({label})'
    return status, score


def main(src, out):
    findings = json.load(open(src))['findings']
    # A verbatim match is deterministic evidence; a later fetch failure or bot page is a
    # false negative. Keep a prior verified result for the same id and URL.
    try:
        prior = {(r['id'], r['url']): r for r in json.load(open(out)) if r['status'] == 'verified'}
    except Exception:
        prior = {}
    rows = []
    for f in findings:
        if (f['id'], f['sourceUrl']) in prior:
            rows.append(prior[(f['id'], f['sourceUrl'])])
            continue
        status, score = check(f['sourceUrl'], f['quote'])
        rows.append({'id': f['id'], 'status': status, 'score': score, 'url': f['sourceUrl']})
    json.dump(rows, open(out, 'w'), indent=1)
    counts = {}
    for r in rows:
        counts[r['status']] = counts.get(r['status'], 0) + 1
    print(f'quotecheck: {len(rows)} findings, ' + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
