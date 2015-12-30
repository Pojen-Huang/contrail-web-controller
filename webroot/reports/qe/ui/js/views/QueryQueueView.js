 /*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'contrail-view',
    'contrail-list-model'
], function (_, ContrailView, ContrailListModel) {
    var QueryQueueView = ContrailView.extend({
        render: function () {
            var self = this,
                viewConfig = self.attributes.viewConfig,
                queryQueuePageTmpl = contrail.getTemplate4Id(ctwc.TMPL_QUERY_QUEUE_PAGE),
                queryQueueType = viewConfig.queueType,
                queryQueueGridId = cowc.QE_HASH_ELEMENT_PREFIX + queryQueueType + cowc.QE_QUEUE_GRID_SUFFIX;

            self.$el.append(queryQueuePageTmpl({queryQueueType: queryQueueType }));

            var queueRemoteConfig = {
                ajaxConfig: {
                    url: "/api/qe/query/queue?queryQueue=" + queryQueueType,
                    type: 'GET'
                },
                dataParser: function (response) {
                    return response;
                }
            };

            var listModelConfig = {
                remote: queueRemoteConfig
            };

            self.model = new ContrailListModel(listModelConfig);
            self.renderView4Config($(queryQueueGridId), self.model, self.getQueryQueueViewConfig(queueRemoteConfig));
        },

        getQueryQueueViewConfig: function (queueRemoteConfig) {
            var self = this,
                viewConfig = self.attributes.viewConfig,
                queryQueueType = viewConfig.queueType,
                pagerOptions = viewConfig['pagerOptions'],
                queueColorMap = [null, null, null, null, null];

            var resultsViewConfig = {
                elementId: cowl.QE_QUERY_QUEUE_GRID_ID,
                title: cowl.TITLE_QUERY_QUEUE,
                view: "GridView",
                viewConfig: {
                    elementConfig: getQueryQueueGridConfig(queryQueueType, queueRemoteConfig, pagerOptions, self, queueColorMap)
                }
            };

            return resultsViewConfig;
        },

        renderQueryResultGrid: function(queryQueueItem, queryResultType, queueColorMap, renderCompleteCB) {
            var self = this,
                viewConfig = self.attributes.viewConfig,
                modelMap = contrail.handleIfNull(self.modelMap, {}),
                childViewMap = self.childViewMap,
                queryQueueResultTabView = contrail.checkIfExist(childViewMap[cowl.QE_QUERY_QUEUE_TABS_ID]) ? childViewMap[cowl.QE_QUERY_QUEUE_TABS_ID] : null,
                queryQueueType = viewConfig.queueType,
                queryQueueGridId = cowc.QE_HASH_ELEMENT_PREFIX + queryQueueType + cowc.QE_QUEUE_GRID_SUFFIX,
                queryQueueResultId = cowc.QE_HASH_ELEMENT_PREFIX + queryQueueType + cowc.QE_QUEUE_RESULT_SUFFIX;

            $(queryQueueGridId).data('contrailGrid').collapse();

            if (queryQueueResultTabView === null) {
                self.renderView4Config($(queryQueueResultId), null, getQueryQueueTabViewConfig(self, queryQueueItem, queryResultType, queueColorMap), null, null, modelMap, function() {
                    if (queryQueueResultTabView === null) {
                        queryQueueResultTabView = contrail.checkIfExist(childViewMap[cowl.QE_QUERY_QUEUE_TABS_ID]) ? childViewMap[cowl.QE_QUERY_QUEUE_TABS_ID] : null;
                        self.renderQueryResultChart(queryQueueResultTabView, queryQueueItem, modelMap, renderCompleteCB);
                    }
                });
            } else {
                queryQueueResultTabView.renderNewTab(cowl.QE_QUERY_QUEUE_TABS_ID, getQueryResultGridTabViewConfig(self, queryQueueItem, queryResultType, queueColorMap), true, modelMap, function() {
                    self.renderQueryResultChart(queryQueueResultTabView, queryQueueItem, modelMap, renderCompleteCB);
                });
            }
        },

        renderQueryResultChart: function(queryQueueResultTabView, queryQueueItem, modelMap, renderCompleteCB) {
            var queryId = queryQueueItem.queryReqObj.queryId,
                selectStr = queryQueueItem.queryReqObj.formModelAttrs.select,
                formQueryIdSuffix = '-' + queryId,
                queryResultChartId = cowl.QE_QUERY_RESULT_CHART_ID + formQueryIdSuffix,
                selectArray = selectStr.replace(/ /g, "").split(","),
                queryResultListModel = modelMap[cowc.UMID_QUERY_RESULT_LIST_MODEL],
                queryQueueTabId = cowl.QE_QUERY_QUEUE_TABS_ID;

            if (selectArray.indexOf("T=") !== -1 && $('#' + queryResultChartId).length === 0) {
                if (!(queryResultListModel.isRequestInProgress()) && queryResultListModel.getItems().length > 0) {
                    queryQueueResultTabView.renderNewTab(queryQueueTabId, getQueryResultChartTabViewConfig(queryQueueItem), false, modelMap, function() {
                        renderCompleteCB();
                    });
                } else {
                    queryResultListModel.onAllRequestsComplete.subscribe(function () {
                        if (queryResultListModel.getItems().length > 0) {
                            queryQueueResultTabView.renderNewTab(queryQueueTabId, getQueryResultChartTabViewConfig(queryQueueItem), false, modelMap, function() {
                                renderCompleteCB();
                            });
                        }
                    });
                }
            }

            renderCompleteCB();

        }

    });

    function getQueryQueueGridConfig(queryQueueType, queueRemoteConfig, pagerOptions, queryQueueView, queueColorMap) {
        return {
            header: {
                title: {
                    text: cowl.TITLE_QUERY_QUEUE
                },
                defaultControls: {
                    collapseable: true,
                    exportable: true,
                    refreshable: true,
                    searchable: true,
                    //columnPickable: true
                },
                advanceControls: [
                    {
                        type: 'link',
                        linkElementId: cowl.QE_DELETE_MULTIPLE_QUERY_QUEUE_CONTROL_ID,
                        disabledLink: true,
                        title: cowl.TITLE_DELETE_ALL_QUERY_QUEUE,
                        iconClass: 'icon-trash',
                        onClick: function (event, gridContainer, key) {
                            if (!$('#' + cowl.QE_DELETE_MULTIPLE_QUERY_QUEUE_CONTROL_ID).hasClass('disabled-link')) {
                                var gridCheckedRows = $(gridContainer).data('contrailGrid').getCheckedRows(),
                                    queryIds = $.map(gridCheckedRows, function(rowValue, rowKey) {
                                        return rowValue.queryReqObj.queryId;
                                    });

                                showDeleteQueueModal(queryQueueType, queryIds, queueColorMap);
                            }
                        }
                    }
                ]
            },
            body: {
                options: {
                    autoRefresh: false,
                    fixedRowHeight: 30,
                    sortable: {
                        defaultSortCols: {'startTime': {sortAsc: false}}
                    },
                    detail: {
                        template: cowu.generateDetailTemplateHTML(getDetailsTemplate(), cowc.APP_CONTRAIL_CONTROLLER)
                    },
                    checkboxSelectable: {
                        onNothingChecked: function(e){
                            $('#' + cowl.QE_DELETE_MULTIPLE_QUERY_QUEUE_CONTROL_ID).addClass('disabled-link');
                        },
                        onSomethingChecked: function(e){
                            $('#' + cowl.QE_DELETE_MULTIPLE_QUERY_QUEUE_CONTROL_ID).removeClass('disabled-link');
                        }
                    },
                    actionCell: function(dc){
                        return getQueueActionColumn(queryQueueType, dc, queryQueueView, queueColorMap);
                    }
                },
                dataSource: {
                    remote: queueRemoteConfig
                }
            },
            columnHeader: {
                columns: qewgc.getQueueColumnDisplay()
            },
            footer: {
                pager: contrail.handleIfNull(pagerOptions, { options: { pageSize: 25, pageSizeSelect: [25, 50, 100] } })
            }
        };
    };

    function getDetailsTemplate() {
        return {
            actions: [],
            templateGenerator: 'ColumnSectionTemplateGenerator',
            templateGeneratorConfig: {
                columns: [
                    {
                        class: 'span6',
                        rows: [
                            {
                                templateGenerator: 'BlockListTemplateGenerator',
                                title: cowl.TITLE_QUERY,
                                advancedViewOptions: false,
                                templateGeneratorConfig: [
                                    {
                                        key: 'opsQueryId',
                                        templateGenerator: 'TextGenerator'
                                    },
                                    {
                                        key: 'queryReqObj.queryId',
                                        templateGenerator: 'TextGenerator'
                                    },
                                    {
                                        key: 'queryReqObj.formModelAttrs.table_name',
                                        templateGenerator: 'TextGenerator'
                                    },
                                    {
                                        key: 'queryReqObj.formModelAttrs.from_time_utc',
                                        templateGenerator: 'TextGenerator',
                                        templateGeneratorConfig: {
                                            formatter: 'date-time'
                                        }
                                    },
                                    {
                                        key: 'queryReqObj.formModelAttrs.to_time_utc',
                                        templateGenerator: 'TextGenerator',
                                        templateGeneratorConfig: {
                                            formatter: 'date-time'
                                        }
                                    },
                                    {
                                        key: 'queryReqObj.formModelAttrs.select',
                                        templateGenerator: 'TextGenerator'
                                    },
                                    {
                                        key: 'queryReqObj.formModelAttrs.filter',
                                        templateGenerator: 'TextGenerator'
                                    },
                                    {
                                        key: 'queryReqObj.formModelAttrs.where',
                                        templateGenerator: 'TextGenerator'
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        class: 'span6',
                        rows: [
                            {
                                templateGenerator: 'BlockListTemplateGenerator',
                                title: cowl.TITLE_QUERY_STATUS,
                                advancedViewOptions: false,
                                templateGeneratorConfig: [
                                    {
                                        key: 'status',
                                        templateGenerator: 'TextGenerator'
                                    },
                                    {
                                        key: 'count',
                                        templateGenerator: 'TextGenerator'
                                    },
                                    {
                                        key: 'timeTaken',
                                        templateGenerator: 'TextGenerator',
                                        templateGeneratorConfig: {
                                            formatter: 'time-period'
                                        }
                                    },
                                    {
                                        key: 'progress',
                                        templateGenerator: 'TextGenerator',
                                        templateGeneratorConfig: {
                                            formatter: 'percentage'
                                        }
                                    },
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    }

    function getQueueActionColumn(queryQueueType, queryQueueItem, queryQueueView, queueColorMap) {
        var queryQueueListModel = queryQueueView.model,
            queryFormModelData = queryQueueItem.queryReqObj.formModelAttrs,
            status = queryQueueItem.status,
            queryId = queryQueueItem.queryReqObj.queryId,
            errorMessage = queryQueueItem.errorMessage,
            queryFormTimeRange = queryFormModelData.time_range,
            actionCell = [];

        if(status == 'queued'){
            return actionCell;
        }

        if(status != "error") {
            actionCell.push({
                title: cowl.TITLE_VIEW_QUERY_RESULT,
                iconClass: 'icon-list-alt',
                onClick: function(rowIndex){
                    var queryQueueItem = queryQueueListModel.getItem(rowIndex);
                    viewQueryResultAction (queryQueueItem, queryQueueView, queueColorMap, 'queue');

                }
            });

            actionCell.push({
                title: cowl.TITLE_MODIFY_QUERY,
                iconClass: 'icon-pencil',
                onClick: function(rowIndex){
                    var queryQueueItem = queryQueueListModel.getItem(rowIndex);
                    queryQueueItem.queryReqObj.formModelAttrs.time_range = -1;
                    loadQueryFormPage(queryFormModelData, cowc.QUERY_TYPE_MODIFY)
                }
            });
        } else if(errorMessage != null) {
            if(errorMessage.message != null && errorMessage.message != '') {
                errorMessage = errorMessage.message;
            }
            actionCell.push({
                title: cowl.TITLE_VIEW_QUERY_ERROR,
                iconClass: 'icon-exclamation-sign',
                onClick: function(rowIndex){
                    //TODO - create info modal
                    showInfoWindow(errorMessage, cowl.TITLE_ERROR);
                }
            });
        }

        if(queryFormTimeRange !== null && queryFormTimeRange != -1) {
            actionCell.push({
                title: cowl.  TITLE_RERUN_QUERY,
                iconClass: 'icon-repeat',
                onClick: function(rowIndex){
                    var queryQueueItem = queryQueueListModel.getItem(rowIndex);
                    loadQueryFormPage(queryFormModelData, cowc.QUERY_TYPE_RERUN)
                }
            });
        }

        actionCell.push({
            title: cowl.TITLE_DELETE_QUERY,
            iconClass: 'icon-trash',
            onClick: function(rowIndex){
                showDeleteQueueModal(queryQueueType, [queryId], queueColorMap)
            }
        });

        return actionCell;
    };

    function viewQueryResultAction (queryQueueItem, queryQueueView, queueColorMap, queryType) {
        if (_.compact(queueColorMap).length < 5) {
            var queryId = queryQueueItem.queryReqObj.queryId,
                badgeColorKey = getBadgeColorkey4Value(queueColorMap, null),
                queryQueueResultGridTabLinkId = cowl.QE_QUERY_QUEUE_RESULT_GRID_TAB_ID + '-' + queryId + '-tab-link',
                queryQueueResultChartTabLinkId = cowl.QE_QUERY_QUEUE_RESULT_CHART_TAB_ID + '-' + queryId + '-tab-link';

            if ($('#' + queryQueueResultGridTabLinkId).length === 0) {
                queryQueueView.renderQueryResultGrid(queryQueueItem, queryType, queueColorMap, function() {
                    $('#label-icon-badge-' + queryId).addClass('icon-queue-badge-color-' + badgeColorKey);
                    $('#' + queryQueueResultGridTabLinkId).find('.contrail-tab-link-icon').addClass('icon-queue-badge-color-' + badgeColorKey);
                    $('#' + queryQueueResultGridTabLinkId).data('badge_color_key', badgeColorKey);

                    $('#' + queryQueueResultChartTabLinkId).find('.contrail-tab-link-icon').addClass('icon-queue-badge-color-' + badgeColorKey);
                    $('#' + queryQueueResultChartTabLinkId).data('badge_color_key', badgeColorKey);
                    queueColorMap[badgeColorKey] = queryId;
                });
            } else {
                //TODO - create info modal
                showInfoWindow(cowm.QE_QUERY_QUEUE_RESULT_ALREADY_LOADED, cowl.TITLE_ERROR);
            }
        } else {
            //TODO - create info modal
            showInfoWindow(cowm.QE_MAX_QUERY_QUEUE_RESULT_VIEW_INFO, cowl.TITLE_ERROR);
        }
    }

    function loadQueryFormPage(queryFormModelData, queryType) {
        var queryPrefix = queryFormModelData.query_prefix,
            hashP = null;

        switch(queryPrefix) {
            case cowc.FS_QUERY_PREFIX:
                hashP = cowc.FS_HASH_P;
                break;

            case cowc.FR_QUERY_PREFIX:
                hashP = cowc.FR_HASH_P;
                break;

            case cowc.SYSTEM_LOGS_PREFIX:
                hashP = cowc.SL_HASH_P;
                break;

            case cowc.OBJECT_LOGS_PREFIX:
                hashP = cowc.OL_HASH_P;
                break;

            case cowc.STAT_QUERY_PREFIX:
                hashP = cowc.STAT_HASH_P;
                break;
        }

        loadFeature({
            p: hashP,
            q: {
                queryType: queryType,
                queryFormAttributes: queryFormModelData
            }
        });
    }

    function showDeleteQueueModal(queryQueueType, queryIds, queueColorMap) {
        var modalId = queryQueueType + cowl.QE_WHERE_MODAL_SUFFIX;
        cowu.createModal({
            modalId: modalId,
            className: 'modal-700',
            title: cowl.TITLE_DELETE_QUERY,
            btnName: 'Confirm',
            body: cowm.QE_DELETE_QUERY_CONFIRM,
            onSave: function () {
                var postDataJSON = {queryQueue: queryQueueType, queryIds: queryIds},
                    ajaxConfig = {
                        url: '/api/qe/query',
                        type: 'DELETE',
                        data: JSON.stringify(postDataJSON)
                    };
                contrail.ajaxHandler(ajaxConfig, null, function() {
                    var queryQueueGridId = cowc.QE_HASH_ELEMENT_PREFIX + queryQueueType + cowc.QE_QUEUE_GRID_SUFFIX;
                    $(queryQueueGridId).data('contrailGrid').refreshData();

                    $.each(queryIds, function(queryIdKey, queryIdValue) {
                        removeBadgeColorFromQueryQueue(queueColorMap, queryIdValue.queryId);
                    });
                });
                $("#" + modalId).modal('hide');
            }, onCancel: function () {
                $("#" + modalId).modal('hide');
            }
        });
    }

    function getQueryQueueTabViewConfig(self, queryQueueItem, queryResultType, queueColorMap) {
        return {
            elementId: cowl.QE_QUERY_QUEUE_TABS_ID,
            view: "TabsView",
            viewConfig: {
                theme: cowc.TAB_THEME_WIDGET_CLASSIC,
                tabs: getQueryResultGridTabViewConfig(self, queryQueueItem, queryResultType, queueColorMap)
            }
        };
    };

    function getQueryResultGridTabViewConfig(self, queryQueueItem, queryResultType, queueColorMap) {
        var queryFormAttributes = queryQueueItem.queryReqObj,
            queryId = queryFormAttributes.queryId,
            queryIdSuffix = '-' + queryId,
            queryResultGridId = cowl.QE_QUERY_RESULT_GRID_ID + queryIdSuffix,
            queryResultTextId = cowl.QE_QUERY_RESULT_TEXT_ID + '-grid' + queryIdSuffix,
            queryQueueResultGridTabId = cowl.QE_QUERY_QUEUE_RESULT_GRID_TAB_ID + queryIdSuffix;

        return [{
            elementId: queryQueueResultGridTabId,
            title: 'Result',
            iconClass: 'icon-table',
            view: "SectionView",
            tabConfig: {
                activate: function(event, ui) {
                    if ($('#' + queryResultGridId).data('contrailGrid')) {
                        $('#' + queryResultGridId).data('contrailGrid').refreshView();
                    }
                },
                removable: true,
                onRemoveTab: function () {
                    removeBadgeColorFromQueryQueue(queueColorMap, queryId);
                }
            },
            viewConfig: {
                rows: [
                    {
                        columns: [
                            {
                                elementId: queryResultTextId,
                                view: 'QueryTextView',
                                viewPathPrefix: "reports/qe/ui/js/views/",
                                app: cowc.APP_CONTRAIL_CONTROLLER,
                                viewConfig: {
                                    queryFormAttributes: queryFormAttributes
                                }
                            }
                        ]
                    },
                    {
                        columns: [
                            {
                                elementId: queryResultGridId,
                                view: 'QueryResultGridView',
                                viewConfig: {
                                    queryResultPostData: { queryId: queryId },
                                    queryFormAttributes: queryFormAttributes,
                                    gridOptions: getQueryQueueResultGridOptions(self, queryFormAttributes)
                                }
                            }
                        ]
                    }
                ]
            }
        }];
    }

    function getQueryQueueResultGridOptions(self, queryFormAttributes) {
        var queryPrefix = queryFormAttributes.formModelAttrs.query_prefix,
            gridOptions = {};

        switch(queryPrefix) {
            case cowc.FS_QUERY_PREFIX:
                gridOptions = {
                    titleText: cowl.TITLE_FLOW_SERIES,
                    queryQueueUrl: cowc.URL_QUERY_FLOW_QUEUE,
                    queryQueueTitle: cowl.TITLE_FLOW
                };
                break;

            case cowc.FR_QUERY_PREFIX:
                gridOptions = {
                    titleText: cowl.TITLE_FLOW_RECORD,
                    queryQueueUrl: cowc.URL_QUERY_FLOW_QUEUE,
                    queryQueueTitle: cowl.TITLE_FLOW,
                    gridColumns: [{
                        id: 'fr-details', field: "", name: "", resizable: false, sortable: false, width: 30, minWidth: 30, searchable: false, exportConfig: {allow: false},
                        allowColumnPickable: false,
                        formatter: function (r, c, v, cd, dc) {
                            return '<i class="icon-external-link-sign" title="Analyze Session"></i>';
                        },
                        cssClass: 'cell-hyperlink-blue',
                        events: {
                            onClick: qewgc.getOnClickFlowRecord(self, queryFormAttributes.formModelAttrs)
                        }
                    }]
                };
                break;

            case cowc.SYSTEM_LOGS_PREFIX:
                gridOptions = {
                    titleText: cowl.TITLE_SYSTEM_LOGS,
                    queryQueueUrl: cowc.URL_QUERY_LOG_QUEUE,
                    queryQueueTitle: cowl.TITLE_LOG
                };
                break;

            case cowc.OBJECT_LOGS_PREFIX:
                gridOptions = {
                    titleText: cowl.TITLE_OBJECT_LOGS,
                    queryQueueUrl: cowc.URL_QUERY_LOG_QUEUE,
                    queryQueueTitle: cowl.TITLE_LOG,
                    fixedRowHeight: false
                };
                break;

            case cowc.STAT_QUERY_PREFIX:
                gridOptions = {
                    titleText: cowl.TITLE_STATS,
                    queryQueueUrl: cowc.URL_QUERY_STAT_QUEUE,
                    queryQueueTitle: cowl.TITLE_STATS
                };
                break;
        }

        return gridOptions
    }

    function getQueryResultChartTabViewConfig(queryQueueItem) {
        var queryId = queryQueueItem.queryReqObj.queryId,
            queryFormAttributes = queryQueueItem.queryReqObj,
            queryIdSuffix = '-' + queryId,
            queryResultChartId = cowl.QE_QUERY_RESULT_CHART_ID + queryIdSuffix,
            queryResultChartGridId = cowl.QE_QUERY_RESULT_CHART_GRID_ID + queryIdSuffix,
            queryResultChartTabViewConfig = [],
            queryResultTextId = cowl.QE_QUERY_RESULT_TEXT_ID + '-chart' + queryIdSuffix,
            queryQueueResultChartTabId = cowl.QE_QUERY_QUEUE_RESULT_CHART_TAB_ID + queryIdSuffix;

        queryResultChartTabViewConfig.push({
            elementId: queryQueueResultChartTabId,
            title: 'Chart',
            iconClass: 'icon-table',
            view: "SectionView",
            tabConfig: {
                activate: function (event, ui) {
                    $('#' + queryResultChartId).find('svg').trigger('refresh');
                    if ($('#' + queryResultChartGridId).data('contrailGrid')) {
                        $('#' + queryResultChartGridId).data('contrailGrid').refreshView();
                    }
                },
                removable: true
            },
            viewConfig: {
                rows: [
                    {
                        columns: [
                            {
                                elementId: queryResultTextId,
                                view: 'QueryTextView',
                                viewPathPrefix: "reports/qe/ui/js/views/",
                                app: cowc.APP_CONTRAIL_CONTROLLER,
                                viewConfig: {
                                    queryFormAttributes: queryFormAttributes
                                }
                            }
                        ]
                    },
                    {
                        columns: [
                            {
                                elementId: queryResultChartId,
                                title: cowl.TITLE_CHART,
                                iconClass: 'icon-bar-chart',
                                view: "QueryResultLineChartView",
                                viewConfig: {
                                    queryId: queryId,
                                    queryFormAttributes: queryFormAttributes.formModelAttrs,
                                    queryResultChartId: queryResultChartId,
                                    queryResultChartGridId: queryResultChartGridId
                                }
                            }
                        ]
                    }
                ]
            }
        });

        return queryResultChartTabViewConfig;
    }

    function removeBadgeColorFromQueryQueue(queueColorMap, queryId) {
        var badgeColorKey = getBadgeColorkey4Value(queueColorMap, queryId);

        if (badgeColorKey !== null) {
            $('#label-icon-badge-' + queryId).removeClass('icon-queue-badge-color-' + badgeColorKey);
            queueColorMap[badgeColorKey] = null;

        }
    }

    function getBadgeColorkey4Value(queueColorMap, value) {
        var badgeColorKey = null;

        $.each(queueColorMap, function(colorKey, colorValue) {
            if (colorValue === value) {
                badgeColorKey = colorKey;
                return false;
            }
        });

        return badgeColorKey
    }

    return QueryQueueView;
});