/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */
var commonUtils = require(process.mainModule.exports["corePath"] +
                          '/src/serverroot/utils/common.utils');

var configJsonModifyObj = {
    'virtual-network': {
        'isConfig': true,
        'preProcessCB': {
            'applyOnOldJSON': modifyVirtualNetworkConfigData,
        },
        'optFields': ['virtual_network_properties',
            'network_ipam_refs', 'network_policy_refs',
            'route_target_list', 'export_route_target_list',
            'import_route_target_list', 'is_shared',
            'router_external', 'id_perms:enable',
            'flood_unknown_unicast', 'multi_policy_service_chains_enabled',
            'route_table_refs', 'provider_properties',
            'ecmp_hashing_include_fields'],
        'mandateFields': ['fq_name', 'uuid', 'display_name'],
        'subType': {
            'project': {
                'optFields': ['floating_ip_pool_refs'],
                'mandateFields': ['fq_name', 'uuid', 'display_name']
            }
        },
    },
    'network-ipam': {
        'isConfig': true,
        'optFields': ['network_ipam_mgmt', 'virtual_DNS_refs'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'virtual-machine-interface': {
        'isConfig': true,
        'preProcessCB': {
            'applyOnOldJSON': modifyConfigDataByAttrHref,
            'applyOnNewJSON': modifyConfigDataByHref
        },
        'optFields': ['ecmp_hashing_include_fields', 'virtual_machine_interface_bindings',
            'virtual_machine_interface_allowed_address_pairs',
            'service_health_check_refs', 'virtual_machine_interface_dhcp_option_list',
            'virtual_machine_interface_fat_flow_protocols',
            'id_perms:enable',
            'virtual_machine_interface_refs',
            'interface_route_table_refs',
            'virtual_machine_interface_properties:local_preference',
            'virtual_machine_interface_properties:interface_mirror',
            'virtual_machine_interface_properties:sub_interface_vlan_tag',
            'virtual_machine_interface_mac_addresses', 'security_group_refs',
            'virtual_network_refs', 'virtual_machine_interface_device_owner',
            'virtual_machine_interface_disable_policy'
        ],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'security-group': {
        'isConfig': true,
        'preProcessCB': {
            'applyOnOldJSON': modifySecurityGroupConfigData,
        },
        'optFields': ['security_group_entries', 'configured_security_group_id'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'logical-router': {
        'isConfig': true,
        'preProcessCB': {
            'applyOnOldJSON': modifyConfigDataByAttrHref,
            'applyOnNewJSON': modifyConfigDataByHref
        },
        'optFields': [
            'virtual_machine_interface_refs',
            'virtual_network_refs',
            'configured_route_target_list'
        ],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'virtual-DNS': {
        'isConfig': true,
        'mandateFields': ['fq_name', 'uuid', 'display_name', 'virtual_DNS_data']
    },
    'virtual-DNS-record': {
        'isConfig': true,
        'mandateFields': ['fq_name', 'uuid', 'display_name',
                          'virtual_DNS_record_data']
    },
    'service-instance': {
        'isConfig': true,
        'optFields': ['service_instance_properties'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'bgp-as-a-service': {
        'isConfig': true,
        'preProcessCB': {
            'applyOnOldJSON': modifyConfigDataByAttrHref,
        },
        'optFields': ['bgpaas_session_attributes',
                      'autonomous_system',
                      'bgpaas_ip_address',
                      'virtual_machine_interface_refs',
                      'bgpaas_ipv4_mapped_ipv6_nexthop',
                      'bgpaas_suppress_route_advertisement'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'physical-interface': {
        'isConfig': true,
        'optFields': ['physical_interface_refs'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'logical-interface': {
        'isConfig': true,
        'preProcessCB': {
            'applyOnOldJSON': modifyConfigDataByAttrHref,
        },
        'optFields': ['virtual_machine_interface_refs'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'global-system-config': {
        'isConfig': true,
        'optFields': ['autonomous_system', 'ibgp_auto_mesh', 'ip_fabric_subnets'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'global-vrouter-config': {
        'isConfig': true,
        'optFields': ['forwarding_mode', 'vxlan_network_identifier_mode',
                      'encapsulation_priorities', 'linklocal_services',
                      'flow_export_rate', 'flow_aging_timeout_list',
                      'ecmp_hashing_include_fields'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'service-appliance': {
        'isConfig': true,
        'optFields': ['service_appliance_ip_address',
            'service_appliance_user_credentials',
            'service_appliance_properties', 'physical_interface_refs'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'service-appliance-set': {
        'isConfig': true,
        'optFields': ['service_appliance_ha_mode', 'service_appliance_driver',
            'service_appliance_set_properties'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'route-table': {
        'isConfig': true,
        'optFields': ['routes'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'interface-route-table': {
        'isConfig': true,
        'optFields': ['interface_route_table_routes'],
        'mandateFields': ['fq_name', 'uuid', 'display_name']
    },
    'physical-topology': {
        'preProcessCB': {
            'applyOnOldJSON': modifyPhyTopoData,
            'applyOnNewJSON': modifyPhyTopoData,
        }
    },
    'arrayDiff': {
     /*   'floating-ip-pool': {
        }
      */
      'bgp-router':{}
    },
    'configDelete': {
        'virtual-machine-interface': {
            'del-back-refs': [
                'instance-ip'
            ]
        }
    }
};

function modifyPhyTopoData (type, jsonData, optFields, mandateFields)
{
    if (null == jsonData) {
        return jsonData;
    }
    var resultJSON = commonUtils.cloneObj(jsonData);
    var nodesLen = 0;
    try {
        nodesLen = resultJSON['nodes'].length;
    } catch(e) {
        nodesLen = 0;
    }

    for (var i = 0; i < nodesLen; i++) {
        if (null != resultJSON['nodes'][i]['more_attributes']) {
            delete resultJSON['nodes'][i]['more_attributes'];
        }
    }
    return resultJSON;
}

var configArrSkipObjsUUID = ['href', 'uuid'];
var configArrSkipObjsAttr = ['href', 'attr'];
var configArrSkipObjsHref = ['href'];
function modifyConfigDataByAttrHref (type, configData, optFields, mandateFields)
{
    return modifyConfigData(type, configData, optFields, mandateFields,
                            configArrSkipObjsAttr);
}

function modifyConfigDataByHref (type, configData, optFields, mandateFields)
{
    return modifyConfigData(type, configData, optFields, mandateFields,
                            configArrSkipObjsHref);
}

function configArrAttrFound (configObj, skipArr)
{
    var skipArrLen = skipArr.length;
    for (var i = 0; i < skipArrLen; i++) {
        var found = false;
        for (key in configObj) {
            if (key == skipArr[i]) {
                found = true;
                break;
            }
        }
        if (false == found) {
            return false;
        }
    }
    return true;
}

function modifyVirtualNetworkConfigData (type, configData, optFields, mandateFields)
{
    /* Modify network ipam_refs in configData */
    var ipamRefs = configData[type]['network_ipam_refs'];
    if (null == ipamRefs) {
        return modifyConfigData(type, configData, optFields, mandateFields,
                                configArrSkipObjsUUID);
    }
    var ipamRefsLen = ipamRefs.length;
    for (var i = 0; i < ipamRefsLen; i++) {
        var ipamSubnets = [];
        var ipamSubnetsLen = 0;
        try {
            ipamSubnets = ipamRefs[i]['attr']['ipam_subnets'];
            ipamSubnetsLen = ipamSubnets.length;
        } catch(e) {
            ipamSubnetsLen = 0;
        }
        if (null == ipamSubnets) {
            ipamSubnetsLen = 0;
        }
        for (var j = 0; j < ipamSubnetsLen; j++) {
            delete ipamSubnets[j]['dns_server_address'];
        }
    }
    return modifyConfigData(type, configData, optFields, mandateFields,
                            configArrSkipObjsUUID);
}

function modifySecurityGroupConfigData (type, configData, optFields,
                                        mandateFields)
{
    var tmpConfigData = commonUtils.cloneObj(configData);
    var policyRuleLen = 0;
    try {
        var policyRule =
            tmpConfigData[type]['security_group_entries']['policy_rule'];
        policyRuleLen = policyRule.length;
    } catch(e) {
        policyRuleLen = 0;
    }
    for (var i = 0; i < policyRuleLen; i++) {
        if (null != policyRule[i]['rule_uuid']) {
            delete policyRule[i]['rule_uuid'];
        }
    }
    return tmpConfigData;
}

function modifyConfigData (type, configData, optFields, mandateFields, skipArr)
{
    var newConfigData = commonUtils.cloneObj(configData[type]);
    var optFieldsLen = 0;
    if (null != optFields) {
        optFieldsLen = optFields.length;
    }
    var configArrSkipObjsLen = skipArr.length;
    for (var i = 0; i < optFieldsLen; i++) {
        if (newConfigData[optFields[i]] instanceof Array) {
            var newConfigDataFieldsLen = newConfigData[optFields[i]].length;
            for (var j = 0; j < newConfigDataFieldsLen; j++) {
                if (false ==
                        configArrAttrFound(newConfigData[optFields[i]][j],
                                           skipArr)) {
                    continue;
                }
                for (var k = 0; k < configArrSkipObjsLen; k++) {
                    delete newConfigData[optFields[i]][j][skipArr[k]];
                }
            }
        }
    }
    var resultJSON = {};
    resultJSON[type] = newConfigData;
    return resultJSON;
}

exports.configJsonModifyObj = configJsonModifyObj;
