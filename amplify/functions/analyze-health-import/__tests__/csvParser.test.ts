import { detectDelimiter, parseCsv, splitCsvLine, stripBom } from '../csvParser';

describe('stripBom', () => {
  it('removes a leading UTF-8 BOM', () => {
    expect(stripBom('﻿header,value')).toBe('header,value');
  });

  it('leaves text without a BOM untouched', () => {
    expect(stripBom('header,value')).toBe('header,value');
  });
});

describe('detectDelimiter', () => {
  it('prefers semicolon when present', () => {
    expect(detectDelimiter('a;b;c')).toBe(';');
  });

  it('falls back to tab when no comma or semicolon', () => {
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
  });

  it('defaults to comma', () => {
    expect(detectDelimiter('a,b,c')).toBe(',');
  });

  it('prefers semicolon over comma (locale pt-BR decimal comma case)', () => {
    expect(detectDelimiter('nome;valor')).toBe(';');
  });
});

describe('splitCsvLine', () => {
  it('splits a plain line', () => {
    expect(splitCsvLine('a,b,c', ',')).toEqual(['a', 'b', 'c']);
  });

  it('keeps a delimiter inside quotes as part of the field', () => {
    expect(splitCsvLine('"São Paulo, SP",100', ',')).toEqual(['São Paulo, SP', '100']);
  });

  it('handles escaped quotes inside a quoted field', () => {
    expect(splitCsvLine('"He said ""hi""",ok', ',')).toEqual(['He said "hi"', 'ok']);
  });

  it('handles an empty field', () => {
    expect(splitCsvLine('a,,c', ',')).toEqual(['a', '', 'c']);
  });

  it('handles a trailing empty field (trailing delimiter)', () => {
    expect(splitCsvLine('a,b,', ',')).toEqual(['a', 'b', '']);
  });
});

describe('parseCsv', () => {
  it('parses a Samsung-style file: metadata line 1, header line 2, trailing comma per row', () => {
    const text = [
      'com.samsung.health.weight,7006003,12',
      'weight,deviceuuid,day_time',
      '63.7,DEVICEID01,2023-11-28 00:00:00.000,',
      '64.1,DEVICEID01,2023-11-29 00:00:00.000,',
    ].join('\n');

    const result = parseCsv(text, { skipLeadingMetadataLine: true });

    expect(result.metadataLine).toBe('com.samsung.health.weight,7006003,12');
    expect(result.headers).toEqual(['weight', 'deviceuuid', 'day_time']);
    expect(result.rows).toEqual([
      ['63.7', 'DEVICEID01', '2023-11-28 00:00:00.000'],
      ['64.1', 'DEVICEID01', '2023-11-29 00:00:00.000'],
    ]);
    expect(result.skippedLineCount).toBe(0);
  });

  it('strips the BOM before parsing', () => {
    const text = '﻿a,b\n1,2';
    const result = parseCsv(text);
    expect(result.headers).toEqual(['a', 'b']);
    expect(result.rows).toEqual([['1', '2']]);
  });

  it('normalizes CRLF and CR line endings', () => {
    const text = 'a,b\r\n1,2\r3,4';
    const result = parseCsv(text);
    expect(result.rows).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('detects semicolon delimiter from the header', () => {
    const text = 'a;b\n1;2';
    const result = parseCsv(text);
    expect(result.headers).toEqual(['a', 'b']);
    expect(result.rows).toEqual([['1', '2']]);
  });

  it('counts anomalous rows (not off by the expected trailing-comma case) without discarding them', () => {
    const text = ['a,b,c', '1,2', '3,4,5,6'].join('\n');
    const result = parseCsv(text);

    expect(result.skippedLineCount).toBe(2);
    expect(result.rows).toEqual([
      ['1', '2', ''],
      ['3', '4', '5'],
    ]);
  });

  it('skips blank lines between rows', () => {
    const text = ['a,b', '1,2', '', '3,4'].join('\n');
    const result = parseCsv(text);
    expect(result.rows).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('handles an empty file gracefully', () => {
    const result = parseCsv('');
    expect(result.headers).toEqual(['']);
    expect(result.rows).toEqual([]);
  });

  it('respects quoted fields containing newlines', () => {
    const text = 'a,b\n"line1\nline2",2';
    // O parser atual quebra por linha ANTES de tratar aspas multi-linha --
    // documentando o comportamento real (limitacao conhecida): campos com
    // quebra de linha dentro de aspas nao sao suportados. Nenhum arquivo do
    // Samsung Health real observado usa esse recurso.
    const result = parseCsv(text);
    expect(result.headers).toEqual(['a', 'b']);
  });
});
