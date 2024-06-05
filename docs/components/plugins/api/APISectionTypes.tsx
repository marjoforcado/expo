import { Fragment } from 'react';

import { APIDataType } from '~/components/plugins/api/APIDataType';
import {
  PropData,
  TypeDeclarationContentData,
  TypeDefinitionData,
  TypeGeneralData,
  TypeSignaturesData,
} from '~/components/plugins/api/APIDataTypes';
import { APISectionDeprecationNote } from '~/components/plugins/api/APISectionDeprecationNote';
import { APISectionPlatformTags } from '~/components/plugins/api/APISectionPlatformTags';
import {
  resolveTypeName,
  renderFlags,
  CommentTextBlock,
  parseCommentContent,
  renderTypeOrSignatureType,
  getCommentOrSignatureComment,
  getTagData,
  renderParams,
  ParamsTableHeadRow,
  renderDefaultValue,
  renderIndexSignature,
  STYLES_APIBOX,
  getTagNamesList,
  H3Code,
  getCommentContent,
} from '~/components/plugins/api/APISectionUtils';
import { Cell, Row, Table } from '~/ui/components/Table';
import { H2, BOLD, DEMI, P, CODE, MONOSPACE, CALLOUT } from '~/ui/components/Text';

export type APISectionTypesProps = {
  data: TypeGeneralData[];
  sdkVersion: string;
};

const defineLiteralType = (types: TypeDefinitionData[]): JSX.Element | null => {
  const uniqueTypes = Array.from(
    new Set(types.map((t: TypeDefinitionData) => t.value && typeof t.value))
  );
  if (uniqueTypes.length === 1 && uniqueTypes.filter(Boolean).length === 1) {
    return <CODE>{uniqueTypes[0]}</CODE>;
  }
  return null;
};

const renderTypeDeclarationTable = (
  { children, indexSignature, comment }: TypeDeclarationContentData,
  sdkVersion: string,
  index?: number
): JSX.Element => (
  <Fragment key={`type-declaration-table-${children?.map(child => child.name).join('-')}`}>
    {index && index > 0 ? <br /> : undefined}
    <CommentTextBlock comment={comment} />
    <Table>
      <ParamsTableHeadRow />
      <tbody>
        {children?.map(d => renderTypePropertyRow(d, sdkVersion))}
        {indexSignature?.parameters &&
          indexSignature.parameters.map(d => renderTypePropertyRow(d, sdkVersion))}
      </tbody>
    </Table>
  </Fragment>
);

const renderTypePropertyRow = (
  { name, flags, type, comment, defaultValue, signatures, kind }: PropData,
  sdkVersion: string
): JSX.Element => {
  const defaultTag = getTagData('default', comment);
  const initValue = parseCommentContent(
    defaultValue || (defaultTag ? getCommentContent(defaultTag.content) : undefined)
  );
  const commentData = getCommentOrSignatureComment(comment, signatures);
  const hasDeprecationNote = Boolean(getTagData('deprecated', comment));
  return (
    <Row key={name}>
      <Cell fitContent>
        <BOLD>{name}</BOLD>
        {renderFlags(flags, initValue)}
        {kind && renderIndexSignature(kind)}
      </Cell>
      <Cell fitContent>
        {renderTypeOrSignatureType({ type, signatures, allowBlock: true, sdkVersion })}
      </Cell>
      <Cell fitContent>
        <APISectionDeprecationNote comment={comment} />
        <CommentTextBlock
          inlineHeaders
          comment={commentData}
          afterContent={renderDefaultValue(initValue)}
          emptyCommentFallback={hasDeprecationNote ? undefined : '-'}
        />
      </Cell>
    </Row>
  );
};

const renderType = (
  { name, comment, type, typeParameter }: TypeGeneralData,
  sdkVersion: string
): JSX.Element | undefined => {
  if (type.declaration) {
    // Object Types
    return (
      <div key={`type-definition-${name}`} css={STYLES_APIBOX}>
        <APISectionDeprecationNote comment={comment} />
        <APISectionPlatformTags comment={comment} />
        <H3Code tags={getTagNamesList(comment)}>
          <MONOSPACE weight="medium" className="wrap-anywhere">
            {name}
            {type.declaration.signatures ? '()' : ''}
          </MONOSPACE>
        </H3Code>
        <CommentTextBlock comment={comment} includePlatforms={false} />
        {type.declaration.children && renderTypeDeclarationTable(type.declaration, sdkVersion)}
        {type.declaration.signatures
          ? type.declaration.signatures.map(({ parameters, comment }: TypeSignaturesData) => (
              <div key={`type-definition-signature-${name}`}>
                <CommentTextBlock comment={comment} />
                {parameters && renderParams(parameters, sdkVersion)}
              </div>
            ))
          : null}
      </div>
    );
  } else if (type.types && ['union', 'intersection'].includes(type.type)) {
    const literalTypes = type.types.filter((t: TypeDefinitionData) =>
      ['literal', 'intrinsic', 'reference', 'tuple'].includes(t.type)
    );
    const propTypes = type.types.filter((t: TypeDefinitionData) => t.type === 'reflection');
    if (propTypes.length) {
      return (
        <div key={`prop-type-definition-${name}`} css={STYLES_APIBOX}>
          <APISectionDeprecationNote comment={comment} />
          <APISectionPlatformTags comment={comment} />
          <H3Code tags={getTagNamesList(comment)}>
            <MONOSPACE weight="medium" className="wrap-anywhere">
              {name}
            </MONOSPACE>
          </H3Code>
          <CommentTextBlock comment={comment} includePlatforms={false} />
          {type.type === 'intersection' || type.type === 'union' ? (
            <>
              <CALLOUT theme="secondary">
                {type.types
                  .filter(type =>
                    ['reference', 'union', 'intersection', 'intrinsic'].includes(type.type)
                  )
                  .map(validType => (
                    <Fragment key={`nested-reference-type-${validType.name}`}>
                      <CODE className="text-default">{resolveTypeName(validType, sdkVersion)}</CODE>
                      {type.type === 'union' ? ' or ' : ' '}
                    </Fragment>
                  ))}
                {type.type === 'union' ? 'object shaped as below' : 'extended by'}:
              </CALLOUT>
              <br />
            </>
          ) : null}
          {propTypes.map(
            (propType, index) =>
              propType.declaration &&
              renderTypeDeclarationTable(propType.declaration, sdkVersion, index)
          )}
        </div>
      );
    } else if (literalTypes.length) {
      const acceptedLiteralTypes = defineLiteralType(literalTypes);
      return (
        <div key={`type-definition-${name}`} css={STYLES_APIBOX}>
          <APISectionDeprecationNote comment={comment} />
          <APISectionPlatformTags comment={comment} />
          <H3Code tags={getTagNamesList(comment)}>
            <MONOSPACE weight="medium" className="wrap-anywhere">
              {name}
            </MONOSPACE>
          </H3Code>
          <CALLOUT className="mb-3">
            <CALLOUT tag="span" theme="secondary" weight="medium">
              Literal Type:{' '}
            </CALLOUT>
            {acceptedLiteralTypes ?? 'multiple types'}
          </CALLOUT>
          <CommentTextBlock comment={comment} includePlatforms={false} />
          <P>
            <CALLOUT tag="span" theme="secondary" weight="medium">
              Acceptable values are:{' '}
            </CALLOUT>
            {literalTypes.map((lt, index) => (
              <span key={`${name}-literal-type-${index}`}>
                <CODE>{resolveTypeName(lt, sdkVersion)}</CODE>
                {index + 1 !== literalTypes.length ? (
                  <CALLOUT tag="span" theme="quaternary">
                    {' | '}
                  </CALLOUT>
                ) : (
                  ''
                )}
              </span>
            ))}
          </P>
        </div>
      );
    }
  } else if (
    (type.name === 'Record' && type.typeArguments) ||
    ['array', 'reference'].includes(type.type)
  ) {
    return (
      <div key={`record-definition-${name}`} css={STYLES_APIBOX} className="[&>*:last-child]:!mb-0">
        <APISectionDeprecationNote comment={comment} />
        <APISectionPlatformTags comment={comment} />
        <H3Code tags={getTagNamesList(comment)}>
          <MONOSPACE weight="medium" className="wrap-anywhere">
            {name}
          </MONOSPACE>
        </H3Code>
        <P className="mb-3">
          <DEMI theme="secondary">Type: </DEMI>
          <APIDataType typeDefinition={type} sdkVersion={sdkVersion} />
        </P>
        <CommentTextBlock comment={comment} includePlatforms={false} />
      </div>
    );
  } else if (type.type === 'intrinsic') {
    return (
      <div key={`generic-type-definition-${name}`} css={STYLES_APIBOX}>
        <APISectionDeprecationNote comment={comment} />
        <APISectionPlatformTags comment={comment} />
        <H3Code tags={getTagNamesList(comment)}>
          <MONOSPACE weight="medium" className="wrap-anywhere">
            {name}
          </MONOSPACE>
        </H3Code>
        <CommentTextBlock comment={comment} includePlatforms={false} />
        <P>
          <DEMI theme="secondary">Type: </DEMI>
          <CODE>{type.name}</CODE>
        </P>
      </div>
    );
  } else if (type.type === 'conditional' && type.checkType) {
    return (
      <div key={`conditional-type-definition-${name}`} css={STYLES_APIBOX}>
        <APISectionDeprecationNote comment={comment} />
        <APISectionPlatformTags comment={comment} />
        <H3Code tags={getTagNamesList(comment)}>
          <MONOSPACE weight="medium" className="wrap-anywhere">
            {name}&lt;{type.checkType.name}&gt;
          </MONOSPACE>
        </H3Code>
        <CommentTextBlock comment={comment} includePlatforms={false} />
        <P>
          <DEMI theme="secondary">Generic: </DEMI>
          <CODE>
            {type.checkType.name}
            {typeParameter && <> extends {resolveTypeName(typeParameter[0].type, sdkVersion)}</>}
          </CODE>
        </P>
        <P>
          <DEMI theme="secondary">Type: </DEMI>
          <CODE>
            {type.checkType.name}
            {typeParameter && (
              <> extends {type.extendsType && resolveTypeName(type.extendsType, sdkVersion)}</>
            )}
            {' ? '}
            {type.trueType && resolveTypeName(type.trueType, sdkVersion)}
            {' : '}
            {type.falseType && resolveTypeName(type.falseType, sdkVersion)}
          </CODE>
        </P>
      </div>
    );
  } else if (type.type === 'templateLiteral' && type.tail) {
    const possibleData = [type.head ?? '', ...type.tail.flat()].filter(
      entry => typeof entry !== 'string'
    );

    if (possibleData.length === 0 || typeof possibleData[0] === 'string') {
      return undefined;
    }

    return (
      <div key={`conditional-type-definition-${name}`} css={STYLES_APIBOX}>
        <APISectionDeprecationNote comment={comment} />
        <APISectionPlatformTags comment={comment} />
        <H3Code tags={getTagNamesList(comment)}>
          <MONOSPACE weight="medium" className="wrap-anywhere">
            {name}
          </MONOSPACE>
        </H3Code>
        <CommentTextBlock comment={comment} includePlatforms={false} />
        <P>
          String union of <CODE>{resolveTypeName(possibleData[0], sdkVersion)}</CODE> values.
        </P>
      </div>
    );
  }
  return undefined;
};

const APISectionTypes = ({ data, sdkVersion }: APISectionTypesProps) =>
  data?.length ? (
    <>
      <H2 key="types-header">Types</H2>
      {data.map(d => renderType(d, sdkVersion))}
    </>
  ) : null;

export default APISectionTypes;
