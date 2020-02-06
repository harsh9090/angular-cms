import { Content } from './content.model';

export class Page extends Content {
    urlSegment: string;
    linkUrl: string;

    isVisibleOnSite: boolean;
    sortIndex: number;
    childrenSortCriteria: string;
}
